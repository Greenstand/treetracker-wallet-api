const knex = require("../../server/database/knex");
const uuid = require('uuid');
const log = require("loglevel");
const Crypto = require('crypto');
const generator = require('generate-password');

async function register(user){
  const sha512 = function(password, salt){
    var hash = Crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return value;
  };

  const salt = Crypto.randomBytes(32).toString('base64')  //create a secure salt
  const passwordHash = sha512(user.password, salt)

  const apiKey = generator.generate({
      length: 32,
      numbers: true
  });

  await knex('api_key')
    .insert({
      key: apiKey,
      tree_token_api_access: true,
      hash: 'test',
      salt: 'test',
      name: 'test',
    });

  // wallet
  const result = await knex('wallet')
    .insert({
      id: uuid.v4(),
      name: user.name,
      password: passwordHash,
      salt: salt,
    }).returning("*");
  log.info("registered wallet:", result);
  return {
    ...result[0], 
    apiKey, 
    //restore password
    password: user.password,
  };
}

async function clear() {
  log.debug('clear tables');
  await knex('api_key').del();
  await knex('transaction').del();
  await knex('token').del();
  await knex('wallet').del();
  await knex('wallet_trust').del();
  await knex('transfer').del();
}

module.exports = {
  register,
  clear,
}
