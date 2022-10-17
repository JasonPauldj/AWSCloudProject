require('dotenv').config();
const config = require('./config.json');
const mysql = require('mysql2/promise');
const {
    Sequelize
} = require('sequelize');

const dbconfig = {
    host: process.env.MYSQL_HOST,
    port: 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
}

const fs = require('fs');
const rdsCa = fs.readFileSync('./us-east-1-bundle.pem');


module.exports = db = {};

initialize().then(() => console.log("database connection successfully established.")).catch((e) => console.log("error while establishing connection to DB " + e));

async function initialize() {

    console.log("initializing connection to DB");

    //const { host, port, user, password, database } = config.database;
    const {
        host,
        port,
        user,
        password,
        database
    } = dbconfig;
    const connection = await mysql.createConnection({
        host,
        port,
        user,
        password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

    //for local
    // const sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });


    //for prod
    const sequelize = new Sequelize(database, user, password, {
        host: host,
        port: port,
        dialect: 'mysql',
        dialectOptions: {
            // ssl: 'Amazon RDS'
            ssl : {
                rejectUnauthorized: true,
                ca: [rdsCa]
            }
        }
    });

    db.User = require('./user.model.js')(sequelize);
    db.Picture = require('./picture.model.js')(sequelize);
    //foreign key is being added to picture that refers to id column in user_id 
    db.Picture.belongsTo(db.User, {as: 'user_'});
    
    await sequelize.sync({alter: true});
}