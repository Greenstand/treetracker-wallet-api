
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

(async () => {

  const Knex = require('knex')
  const faker = require('faker');
  const { v4: uuidv4 } = require('uuid');


  const Config = require('./config/config');
  const knex = Knex({
    client: 'pg',
    connection:  Config.connectionString[process.env.NODE_ENV]
  })

  const Crypto = require('crypto');
  const sha512 = function(password, salt){
    var hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return value;
  };

  const username = faker.internet.userName()
  const password = faker.internet.password() // not a secure password
  const apiKey = faker.internet.password()

  const salt = faker.internet.password() // not a secure salt
  const passwordHash = sha512(password, salt)

  const trx = await knex.transaction();

  try {


    // create API key
    const apiKeyData = {
      key: apiKey,
      tree_token_api_access: true,
      name: username
    }
    const result0 = await trx('wallet.api_key').insert(apiKeyData).returning('*')
    console.log(result0)

    // create wallet and password, salt

    const result = await trx('wallet.wallet').insert({
      name: username,
      password: passwordHash,
      salt: salt
    }).returning('*')
    const wallet = result[0]
    console.log(wallet)


    // create fake tokens
    for(i=0; i<5000; i++){
      const tokenData = {
        capture_id: uuidv4(),
        wallet_id: wallet.id,
      }
      const result4 = await trx('wallet.token').insert(tokenData).returning('*')
      const token = result4[0]
      console.log(token.id)
    }

    await trx.commit();

    knex.destroy()

    console.log('wallet ' + username);
    console.log('password ' + password);
    console.log('apiKey ' + apiKey);

  } catch (error) {

    console.log(error)
    await trx.rollback()
    knex.destroy()

  }


})().catch(e => console.error(e.stack));
