const bcrypt = require('bcryptjs');
const db = require('./db');

async function create(params) {

    if (await db.User.findOne({
            where: {
                username: params.username
            }
        })) {
        throw 'Username is already taken';
    }

    params.password = await bcrypt.hash(params.password, 10);

    const {
        id,
        first_name,
        last_name,
        username,
        account_created,
        account_updated
    } = await db.User.create(params);

    const user = {
        id: id,
        first_name: first_name,
        last_name: last_name,
        username: username,
        account_created: account_created,
        account_updated: account_updated
    }

    return user;
}


async function getUserByUserName(givenUserName) {

    let user =await db.User.findOne({
        where: {
            username: givenUserName
        }
    });

    return user;

}


async function updateUserByModelInstance(user,params){
    user.set(params);
   return await user.save();
}

/**
 * Function to verify user
 * @param {string} username - the username of the user
 * @returns 
 */
async function verifyUserByUserName(username){
    let user = await db.User.findOne({
        where :{
            username : username
        }
    });

    user.set({
        isVerified :true
    })

    return await user.save();
}

module.exports = {
    create,
    getUserByUserName,
    updateUserByModelInstance,
    verifyUserByUserName
}