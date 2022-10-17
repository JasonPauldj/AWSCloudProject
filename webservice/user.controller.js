require('dotenv').config();
const express = require('express');
const Joi = require('joi');
const userService = require('./user.service');
const pictureService = require('./picture.service');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const {
    uploadFile,
    getFile,
    deleteFile
} = require('./s3');
const fs = require('fs');
const util = require('util');
const {
    del
} = require('express/lib/application');
const unlinkFile = util.promisify(fs.unlink);
const logger = require('./loggerConfig/winston');
const statsdclient = require('./loggerConfig/statsd-client');
const {
    SNSClient,
    PublishCommand
} = require("@aws-sdk/client-sns");
const {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
    QueryCommand
} = require("@aws-sdk/client-dynamodb");
const crypto = require('crypto');

//for local machine
// const {
//     fromIni
// } = require("@aws-sdk/credential-provider-ini");
// const region = 'us-east-1';
// const snsClient = new SNSClient({
//     region,
//     credentials: fromIni({
//         profile: 'dev'
//     })
// });
// const dynamodbClient = new DynamoDBClient({
//     region,
//     credentials: fromIni({
//         profile: 'dev'
//     })
// });

//for PROD
const snsClient = new SNSClient();
const dynamodbClient = new DynamoDBClient();

const upload = multer({
    dest: 'uploads/'
});

const bucketName = process.env.S3_BUCKETNAME;

const userRouter = express.Router();

//POST A NEW USER - WITHOUT AUTHENTICATION
userRouter.route('/').
post((req, res, next) => {

        statsdclient.increment('POST.NEW.USER.COUNTER');

        const schema = Joi.object({
            first_name: Joi.string().required(),
            last_name: Joi.string().required(),
            username: Joi.string().email().required(),
            password: Joi.string().min(6).required()
        });

        if (validateRequest(req, res, next, schema)) {
            logger.info("POST NEW USER - Valid user data.");
            next();
        } else {
            res.sendStatus(400)
        }
    },

    (req, res) => {
        req.body.account_created = new Date();
        req.body.account_updated = new Date();
        req.body.isVerified = false;
        userService.create(req.body).then(async (user) => {

            logger.info("POST NEW USER - User created successfully");
            res.statusCode = 201;
            res.setHeader('Content-type', 'application/json');
            res.json(user);


            //Putting item in DynamoDB
            const token = crypto.randomBytes(64).toString('hex');
            const tableName = process.env.DYNAMODB_TABLE_NAME;
            let currentTime = new Date().getTime();
            let ttl = Math.round(currentTime / 1000) + 5 * 60;
            // console.log("ttl",ttl);
            const dynamoInputParams = {
                Item: {
                    userId: {
                        S: user.username
                    },
                    token: {
                        S: token
                    },
                    ttl: {
                        N: ttl.toString()
                    }
                },
                TableName: tableName
            }
            const dynamoCommand = new PutItemCommand(dynamoInputParams);

            try {
                const dynamoResponse = await dynamodbClient.send(dynamoCommand);
                //console.log(dynamoResponse);
                logger.info("Successfully put item in dynamoDB");
            } catch (err) {
                logger.error("POST NEW USER - Error while putting item in dynamoDB");
                logger.error(err);
                throw err;
            }

            //Publishing message to SNS
            const TopicArn = process.env.SNS_TOPIC_ARN;
            const inputParams = {
                MessageStructure: "json",
                Message: JSON.stringify({
                    lambda: JSON.stringify({
                        username: req.body.username,
                        token: token
                    }),
                    default: JSON.stringify({
                        username: req.body.username,
                        token: token
                    })
                }),
                TopicArn: TopicArn
            }
            const command = new PublishCommand(inputParams);
            try {
                const response = await snsClient.send(command);
                logger.info("Successfully published data to SNS");
            } catch (err) {
                logger.error("POST NEW USER - Error while publishing SNS message");
                logger.error(err);
                throw err;
            }


        }, (err) => {
            if (err === 'Username is already taken') {
                logger.info("POST NEW USER - Username is already taken.");
                res.sendStatus(400);

            } else {
                logger.error("POST NEW USER - error while trying to create user in DB");
                res.sendStatus(503)
            }
        }).catch(err => {
            logger.error("POST NEW USER - Error while creating new user.");
            logger.error(err);
            res.sendStatus(400);

        })
    });


//EVERYROUTE BELOW REQUIRES AUTHENTICATION

const checkUserVerification = async (username) => {
    const user = await userService.getUserByUserName(username);
    return user.isVerified;
}

userRouter.route('/self').put((req, res, next) => {
    statsdclient.increment('PUT.UPDATE.USER.COUNTER');


    //checking for authorization header
    let authHeader = req.headers.authorization;
    if (!authHeader) {
        logger.info("PUT USER - Authentication is required");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
        return;
    }

    const schema = Joi.object({
        first_name: Joi.string().required(),
        last_name: Joi.string().required(),
        password: Joi.string().min(6).required(),
        username: Joi.string().email().required()
    });

    if (!validateRequest(req, res, next, schema)) {
        logger.info("PUT USER - Invalid user details.");
        res.sendStatus(400);
        return;
    }


    let credentials = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const givenUserName = credentials[0];
    userService.getUserByUserName(credentials[0]).then(async (user) => {

        if (!user) {
            logger.info(`PUT USER - Username ${givenUserName} does not exist`);
            throw 'Username "' + givenUserName + '" is does not exist';
        }

        //verifying password
        if (!(await bcrypt.compare(credentials[1], user.dataValues.password))) {
            // console.log("password incorrect");
            logger.info("PUT USER - Incorrect Password");
            throw ('you are not authorized');
        }

        //checking if user is isVerified
        if (!user.isVerified) {
            res.status(403);
            res.send('You have not been verified');
        } else {
            req.user = user;
            logger.info("PUT USER - User successfully authenticated.");
            next();
        }
    }, (err) => {
        logger.error("PUT USER - error while fetching user during authorization.")
        res.sendStatus(503)
    }).catch(err => {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
    })

}, async (req, res) => {
    userService.updateUserByModelInstance(req.user, {
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        password: await bcrypt.hash(req.body.password, 10),
        account_updated: new Date()
    }).then((user) => {
        logger.info("PUT USER - User successfully updated.");
        res.sendStatus(204)
    }, (err) => {
        logger.error("PUT USER - There was an error 503");
        res.sendStatus(503)
    }).catch((err) => {
        logger.info("PUT USER - There was an error while updating the user");
        //console.log("error in put " + err);
    })

}).
get((req, res) => {

    statsdclient.increment('GET.USER.COUNTER');


    //checking for authorization header
    let authHeader = req.headers.authorization;
    if (!authHeader) {
        logger.info("GET USER - Authentication required");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
        return;
    }

    const credentials = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const givenUserName = credentials[0];
    userService.getUserByUserName(credentials[0]).then(async (user) => {

        if (!user) {
            logger.info(`GET USER - Username ${givenUserName} does not exist`);
            throw 'Username "' + givenUserName + '" is does not exist';
        }


        //verifying password
        if (!(await bcrypt.compare(credentials[1], user.dataValues.password))) {
            logger.info("GET USER - Incorrect Password ");
            throw ('you are not authorized');
        }

        //checking if user is isVerified
        if (!user.isVerified) {
            res.status(403);
            res.send('You have not been verified');
        } else {
            const {
                createdAt,
                updatedAt,
                password,
                url,
                file_name,
                file_id,
                upload_date,
                isVerified,
                ...userInfo
            } = user.dataValues;
            logger.info("GET USER - User successfully authenticated");
            res.status(200);
            res.json(userInfo);
        }
    }, (err) => {
        logger.info("GET USER - There was an error while fetching the user from the DB during verification");
        res.sendStatus(503)
    }).catch(err => {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
    })
})

function validateRequest(req, res, next, schema) {
    const options = {
        abortEarly: false,
        allowUnknown: false
    };
    const {
        error,
        value
    } = schema.validate(req.body, options);
    if (error) {
        return false;
    } else {
        req.body = value;
        return true;
    }
}


userRouter.route('/self/pic').post((req, res, next) => {

    statsdclient.increment('POST.USER.PIC.COUNTER');
    //checking for authorization header
    let authHeader = req.headers.authorization;
    if (!authHeader) {
        logger.info("POST USER PIC - Authentication Required");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
        return;
    }

    const credentials = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const givenUserName = credentials[0];
    userService.getUserByUserName(credentials[0]).then(async (user) => {
        if (!user) {
            logger.info("POST USER PIC - User does not exist");
            throw 'Username "' + givenUserName + '" is does not exist';
        }

        //verifying password
        if (!(await bcrypt.compare(credentials[1], user.dataValues.password))) {
            logger.info("POST USER PIC - Incorrect Password");
            throw ('you are not authorized');
        }
        //checking if user is isVerified
        if (!user.isVerified) {
            res.status(403);
            res.send('You have not been verified');
        } else {
            logger.info("POST USER PIC - User successfully authenticated.");
            req.user = user;
            next();
        }
    }, (err) => {
        logger.error("POST USER PIC - There was an error while fetching user from DB for verification");
        res.sendStatus(503)
    }).catch(err => {
        logger.error("POST USER PIC - There was an error");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
    })

}, upload.single('profilePic'), async (req, res, next) => {
    const file = req.file;

    //if the user added a file.
    if (file) {

        const fileExtension = file.originalname.split('.').pop();

        const allowedExtensions = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'];
        // if right file extension is added
        if (fileExtension && allowedExtensions.filter((extension) => extension === fileExtension).length > 0) {

            (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'PNG' || fileExtension === 'JPG' || fileExtension === 'JPEG')
            let pic = await pictureService.getPictureByUserId(req.user.id);

            //if profile picture already exists then delete it from S3 and table
            if (pic) {
                const key = req.user.id + '/' + pic.file_name;
                let result = await getFile(key);
                //if we found a file, we will first delete it
                if (result) {
                    let delRes = await deleteFile(key);

                    pictureService.deletePic(req.user.id);

                }
            }

            const key = req.user.id + '/' + file.originalname;
            //uploading file to s3
            let result = await uploadFile(file, key);
            let resObj = {};
            resObj.userId = req.user.id;
            resObj.file_name = file.originalname;
            resObj.url = bucketName + '/' + req.user.id + '/' + file.originalname;
            resObj.upload_date = new Date().toISOString().split('T')[0];

            //creating the picture in DB
            pic = await pictureService.create({
                userId: resObj.userId,
                file_name: resObj.file_name,
                upload_date: resObj.upload_date,
                url: resObj.url
            })

            //deleting file from folder
            await unlinkFile(file.path);
            logger.info("POST USER PIC -  Picture succesfully uploaded to s3.");
            res.status(200);
            res.json({
                userId: pic.userId,
                file_name: pic.file_name,
                upload_date: pic.upload_date,
                id: pic.id,
                url: pic.url
            });
        } else {
            //wrong extension
            logger.info("POST USER PIC -  Picture unsuccesfully uploaded to s3. Wrong extension.");
            res.sendStatus(400);
        }

    } else {
        //if no attached pic
        logger.info("POST USER PIC -  Picture unsuccesfully uploaded to s3. No image attached.");
        res.sendStatus(400);
    }
}).get((req, res, next) => {

    statsdclient.increment('GET.USER.PIC.COUNTER');

    //authorization
    let authHeader = req.headers.authorization;
    if (!authHeader) {
        logger.info("GET USER PIC - Authentication Required");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
        return;
    }
    const credentials = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const givenUserName = credentials[0];
    userService.getUserByUserName(credentials[0]).then(async (user) => {
        if (!user) {
            logger.info("POST USER PIC - User does not exist");
            throw 'Username "' + givenUserName + '" is does not exist';
        }

        //verifying password
        if (!(await bcrypt.compare(credentials[1], user.dataValues.password))) {
            console.log("password incorrect");
            throw ('you are not authorized');
        }
        //checking if user is isVerified
        if (!user.isVerified) {
            res.status(403);
            res.send('You have not been verified');
        } else {

            req.user = user;
            logger.info("GET USER PIC - User authenticated succesfully.");
            next();
        }

    }, (err) => {
        logger.info("GET USER PIC - There was an error when fetching user from db for authorization.");
        res.sendStatus(503)
    }).catch(err => {
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
    })
}, async (req, res, next) => {

    //getting the pic from db
    let pic = await pictureService.getPictureByUserId(req.user.id);

    //if we found pic
    if (pic) {
        const key = req.user.id + '/' + pic.file_name;
        try {
            const result = await getFile(key);
            if (result) {
                logger.info("GET USER PIC - Got picture successfully;");
                res.status(200);
                res.json({
                    file_name: pic.file_name,
                    url: pic.url,
                    upload_date: pic.upload_date,
                    user_id: pic.userId,
                    id: pic.id
                });
            }
        } catch (err) {
            logger.info("GET USER PIC - Couldn't find the file.");
            res.sendStatus(404);
        }
    } else {
        logger.info("GET USER PIC - Couldn't find the file.");
        res.sendStatus(404);
    }

}).delete((req, res, next) => {

    statsdclient.increment('DELETE.USER.PIC.COUNTER');

    let authHeader = req.headers.authorization;
    if (!authHeader) {
        logger.info("DELETE USER PIC - Authentication Required");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
        return;
    }

    const credentials = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const givenUserName = credentials[0];
    userService.getUserByUserName(credentials[0]).then(async (user) => {
        if (!user) {
            logger.info("POST USER PIC - User does not exist");
            throw 'Username "' + givenUserName + '" is does not exist';
        }
        //verifying password
        if (!(await bcrypt.compare(credentials[1], user.dataValues.password))) {
            logger.info("DELETE USER PIC - Incorrect Password");
            throw ('you are not authorized');
        }
        //checking if user is isVerified
        if (!user.isVerified) {
            res.status(403);
            res.send('You have not been verified');
        } else {

            req.user = user;
            logger.info("DELETE USER PIC - User successfully authenticated");
            next();
        }
    }, (err) => {
        logger.info("DELETE USER PIC - There was an error");
        res.sendStatus(503)
    }).catch(err => {
        logger.error("DELETE USER PIC - Error while fetching item from DB for authorization");
        res.setHeader('WWW-Authenticate', 'Basic');
        res.sendStatus(401);
    })

}, async (req, res, next) => {

    //getting the pic from db
    let pic = await pictureService.getPictureByUserId(req.user.id);

    //if we found pic
    if (pic) {

        const key = req.user.id + '/' + pic.file_name;

        //checking if the file exists in S3
        try {
            const result = await getFile(key);
        } catch (err) {
            logger.error("DELETE  PIC - Error while getting pic from S3");
            res.sendStatus(404);
        }

        //deleting the file
        deleteFile(key).then(() => {
            pictureService.deletePic(req.user.id).then(() => {
                res.sendStatus(204);
            }).catch(e => {
                logger.info("DELETE USER PIC - There was an error while deleting the picture in DB.");
            })
        }, (err) => {
            res.sendStatus(503);
            logger.info("DELETE USER PIC - There was an error while deleting the object.");
        })
    } else {
        res.sendStatus(404);
    }
})


module.exports = userRouter;