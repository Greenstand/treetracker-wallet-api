
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
    const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    const value = hash.digest('hex');
    return value;
  };

  const username = faker.internet.userName()
  const password = faker.internet.password() // not a secure password

  const salt = faker.internet.password() // not a secure salt
  const passwordHash = sha512(password, salt)

  const trx = await knex.transaction();

  try {
    // create wallet and password, salt

    const result = await trx('wallet.wallet').insert({
      name: username,
      password: passwordHash,
      salt
    }).returning('*')
    const wallet = result[0]
    console.log(wallet)


    // create fake tokens
    let i = 0;
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

  } catch (error) {

    console.log(error)
    await trx.rollback()
    knex.destroy()

  }


})().catch(e => console.error(e.stack));
