
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

(async () => {

  const Knex = require('knex')
  const { v4: uuidv4 } = require('uuid');
  const generator = require('generate-password');

  const Config = require('../../config/config');
  console.log(Config.connectionString)
  const knex = Knex({
    client: 'pg',
    connection:  Config.connectionString
  })

  const Crypto = require('crypto');

  const args = process.argv.slice(2)
  if( args.length < 1){
    console.log('Please provide a username')
    throw new Error('Please provide a username');
  }
  const username = args[0]

  const password = generator.generate({
      length: 16,
      numbers: true
  });

  const sha512 = function(password, salt){
    const hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    const value = hash.digest('hex');
    return value;
  };

  const salt = Crypto.randomBytes(32).toString('base64')  // create a secure salt
  const passwordHash = sha512(password, salt)
  
  const apiKey = generator.generate({
      length: 32,
      numbers: true
  });


  const trx = await knex.transaction();

  try {


    // create API key
    const apiKeyData = {
      key: apiKey,
      tree_token_api_access: true,
      name: username
    }
    const result0 = await trx('api_key').insert(apiKeyData).returning('*')
    console.log(result0)

    // create wallet and password, salt

    const result = await trx('wallet').insert({
      name: username,
      password: passwordHash,
      salt
    }).returning('*')
    const wallet = result[0]
    console.log(wallet)

    await trx.commit();

    knex.destroy()

    console.log(`wallet ${  username}`);
    console.log(`password ${  password}`);
    console.log(`api key ${  apiKey}`);

  } catch (error) {

    console.log(error)
    await trx.rollback()
    knex.destroy()

  }


})().catch(e => console.error(e.stack));
