const express = require('express');
const userRouter = require('./user.controller');
const userService = require('./user.service');
const logger = require('./loggerConfig/winston');
const {
  DynamoDBClient,
  QueryCommand
} = require("@aws-sdk/client-dynamodb");

//for local
// const dynamodbClient = new DynamoDBClient({
//     region,
//     credentials: fromIni({
//         profile: 'dev'
//     })
// });

//for PROD
const dynamodbClient = new DynamoDBClient();

const app = express();

app.use(express.json());

//app.use(express.raw({limit: '50mb',type: ['image/*']}));

//VERIFY USER
app.use('/v1/verifyUserEmail', async (req, res) => {
  const token = req.query.token;
  const email = req.query.email;


  userService.getUserByUserName(email).then(async (user) => {

    //if user doesn't exist
    if (!user) {
      logger.info(`GET USER - Username does not exist`);
      throw 'Username does not exist'
    }
    //if user is already verified
    else if (user.isVerified) {
      logger.info('USERNAME already verified');
      throw 'Username already verified'
    }
    //if user exists and is not verified
    else {
      //Fetching item from DynamoDB
      logger.info("Fetching item from DynamoDB");
      const tableName = process.env.DYNAMODB_TABLE_NAME;
      logger.info("TableName " + tableName);
      const currentTime = Math.round(new Date().getTime() / 1000);
      const dynamoQueryInputParams = {
        KeyConditionExpression: "userId = :uId",
        FilterExpression: "#ttl >= :curTime",
        ExpressionAttributeValues: {
          ":uId": {
            S: email
          },
          ":curTime": {
            N: currentTime.toString()
          }
        },
        ExpressionAttributeNames: {
          "#ttl": "ttl"
        },
        TableName: tableName
      }
      const dynamoCommand = new QueryCommand(dynamoQueryInputParams);
      try {

        const dynamoResponse = await dynamodbClient.send(dynamoCommand);
        //if couldn't find a record
        if (dynamoResponse && dynamoResponse.Count == 0) {
          res.status(401);
          logger.info('The token has expired.');
          res.send('Token has expired');
        }
        //found a record
        else {
          userService.verifyUserByUserName(email).then((user) => {
            logger.info('User has been successfully verified');
            res.status(200);
            res.send('Successfully verified');
          }).catch((err) => {
            logger.error("there was an error when verifying user", err);
            res.sendStatus(503);
          })
        }
      } catch (err) {
        logger.error('there was error while querying the DB.', err);
        res.sendStatus(503);
      }
    }

  }).catch(err => {
    res.sendStatus(400);
  })

});

app.use('/v1/user', userRouter);

app.get('/healthz', (req, res) => {
  res.sendStatus(200)
});

app.get('*', (req, res) => {
  res.sendStatus(404)
});

app.post('*', (req, res) => {
  res.sendStatus(404)
});

app.put('*', (req, res) => {
  res.sendStatus(404)
});

app.delete('*', (req, res) => {
  res.sendStatus(404)
});

module.exports = app;