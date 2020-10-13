
(async () => {

  const Knex = require('knex')
  const faker = require('faker');
  const { v4: uuidv4 } = require('uuid');


  const Config = require('./../../config/config.js');
  const knex = Knex({
    client: 'pg',
    connection:  Config.connectionString
  })

  const Crypto = require('crypto');
  const sha512 = function(password, salt){
    var hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return value;
  };

  const salt = faker.internet.password() // not a secure salt
  const password = faker.internet.password() // not a secure password
  const passwordHash = sha512(password, salt)

  const trx = await knex.transaction();

  try {

    const username = faker.internet.userName()

    // create API key
    const apiKey = {
      key: faker.internet.password(),
      tree_token_api_access: true,
      name: username
    }
    const result0 = await trx('api_key').insert(apiKey).returning('*')
    console.log(result0)

    // create wallet and password, salt

    const result = await trx('entity').insert({
      type: 'p',
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      wallet: username,
      password: passwordHash,
      salt: salt
    }).returning('*')
    const entity = result[0]
    console.log(entity)


    // insert fake planters
    const planterData = {
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber()
    }
    const result2 = await trx('planter').insert(planterData).returning('*')
    const planter = result2[0]
    console.log(planter)

    // insert fake tree captures
    let trees = []
    for(i=0; i<1000; i++){
      const captureData = {
        time_created: new Date(),
        time_updated: new Date(),
        planter_id: planter.id,
        lat: 80.0,
        lon: 120.0,
        image_url: "https://treetracker-test-images.s3.eu-central-1.amazonaws.com/2020.07.20.03.00.39_-1.881482156711479_27.20611349640992_4d90da59-8f8a-41a5-afab-3b8bbb458214_IMG_20200719_223641_893600781461680891.jpg",
        uuid: uuidv4(),
        approved: true,
      }
      const result3 = await trx('trees').insert(captureData).returning('*')
      const capture = result3[0]
      trees.push(capture.id)
      console.log(capture.id)
    }

    // create fake tokens
    for ( const treeId of trees ){
      const tokenData = {
        tree_id: treeId,
        entity_id: entity.id
      }
      const result4 = await trx('token').insert(tokenData).returning('*')
      const token = result4[0]
      console.log(token.uuid)
    }

    await trx.commit();

    knex.destroy()

  } catch (error) {

    console.log(error)
    await trx.rollback()
    knex.destroy()

  }


})().catch(e => console.error(e.stack));
