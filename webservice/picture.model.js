const { DataTypes } = require('sequelize');
const {Sequelize} = require('sequelize');

module.exports = model;

function model(sequelize) {
    const columns = {
        // first_name: { type: DataTypes.STRING, allowNull: false },
        // last_name: { type: DataTypes.STRING, allowNull: false },
        // password: { type: DataTypes.STRING, allowNull: false },
        // username: { type: DataTypes.STRING, allowNull: false },
        // account_created : {type: DataTypes.DATE,allowNull:true},
        // account_updated : {type: DataTypes.DATE,allowNull:true},
        id : {type : DataTypes.UUID,defaultValue:Sequelize.UUIDV4,allowNull:false,primaryKey:true},
        url : {type : DataTypes.STRING, allowNull:true},
        upload_date :{type: DataTypes.STRING, allowNull:true},
        file_name : {type: DataTypes.STRING, allowNull:true}
      //  user_id : {type: DataTypes.STRINF, allowNull:true, }
    };

    // const options = {
    //     defaultScope: {
    //         // exclude hash by default
    //         attributes: { exclude: ['hash'] }
    //     },
    //     scopes: {
    //         // include hash with this scope
    //         withHash: { attributes: {}, }
    //     }
    // };

    return sequelize.define('Picture', columns);
}