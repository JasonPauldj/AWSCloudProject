const StatsD = require('hot-shots');

const client = new StatsD({host: 'localhost',port : 8125});

module.exports=client;