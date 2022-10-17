require('dotenv').config();
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");

//required for local machine
// const {
//     fromIni
// } = require("@aws-sdk/credential-provider-ini");
// const region = 'us-east-1';
// const s3 = new S3Client({
//     region,
//     credentials: fromIni({
//         profile: 'dev'
//     })
// });

const fs = require('fs');

 

//for PORD
const bucketName = process.env.S3_BUCKETNAME;
const s3 = new S3Client();


// uploads a file to s3
function uploadFile(file,key) {
    const fileStream = fs.createReadStream(file.path)
    const uploadParams = {
        Bucket: bucketName,
        Body: fileStream,
        Key: key
    }
    return s3.send(new PutObjectCommand(uploadParams))
}

function getFile(key) {
    console.log("in get file");
    const getParams = {
        Key: key,
        Bucket: bucketName
    }
    return s3.send(new GetObjectCommand(getParams))
}


function deleteFile(key) {

    const deleteParams = {
        Key: key,
        Bucket: bucketName
    }
    return s3.send(new DeleteObjectCommand(deleteParams))
}

module.exports= {
    uploadFile,
    getFile,
    deleteFile
}