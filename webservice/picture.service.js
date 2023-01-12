const db = require('./db');

async function create(params) {
    const pic = await db.Picture.create(params);
    return pic;
}

async function deletePic(userId) {
   return await db.Picture.destroy({
        where: {
          userId: userId
        }
      });
}


async function getPictureByUserId(userId) {

    let pic =await db.Picture.findOne({
        where: {
            userId: userId
        }
    });

    return pic;
}


module.exports = {
    create,
    deletePic,
    getPictureByUserId
}