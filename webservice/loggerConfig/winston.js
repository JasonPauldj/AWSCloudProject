const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: '../webapp_logs/app.log'})
    ],
    handleExceptions:true,
    exitOnError: false
  });


  module.exports=logger;