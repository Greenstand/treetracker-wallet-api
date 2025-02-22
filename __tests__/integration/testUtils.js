const uuid = require('uuid');
const log = require('loglevel');
const Crypto = require('crypto');
const { expect } = require('chai');
const JWTService = require('../../server/services/JWTService');
const TransferEnum = require('../../server/utils/transfer-enum');
const knex = require('../../server/infra/database/knex');

/*
 * register the user, create password hash, and apiKey
 */
async function register(user) {
  const sha512 = function (password, salt) {
    const hash = Crypto.createHmac(
      'sha512',
      salt,
    ); /** Hashing algorithm sha512 */
    hash.update(password);
    const value = hash.digest('hex');
    return value;
  };

  const salt = Crypto.randomBytes(32).toString('base64'); // create a secure salt
  const passwordHash = sha512(user.password, salt);

  // wallet
  const result = await knex('wallet')
    .insert({
      id: uuid.v4(),
      name: user.name,
      password: passwordHash,
      salt,
    })
    .returning('*');
  log.info('registered wallet:', result);
  return {
    ...result[0],
    // restore password
    password: user.password,
  };
}

/*
 * create the user, apiKey, then login, return
 * token
 */
async function registerAndLogin(user) {
  const userRegistered = await register(user);
  const token = JWTService.sign(userRegistered);
  userRegistered.token = token;

  return userRegistered;
}

async function clear() {
  log.debug('clear tables');
  await knex('transaction').del();
  await knex('token').del();
  await knex('wallet').del();
  await knex('wallet_trust').del();
  await knex('transfer').del();
}

/*
 * Add a token to a wallet
 */
async function addToken(wallet, token) {
  const result = await knex('token')
    .insert({
      ...token,
      wallet_id: wallet.id,
    })
    .returning('*');
  expect(result[0]).property('id').eq(token.id);
  expect(result[0]).property('wallet_id').eq(wallet.id);
  return result[0];
}

/*
 * Directly pending a token send request
 */
async function sendAndPend(walletSender, walletReceiver, bundleSize) {
  const result = await knex('transfer')
    .insert({
      id: uuid.v4(),
      originator_wallet_id: walletSender.id,
      source_wallet_id: walletSender.id,
      destination_wallet_id: walletReceiver.id,
      type: TransferEnum.TYPE.send,
      parameters: {
        bundleSize,
      },
      state: TransferEnum.STATE.pending,
      active: true,
    })
    .returning('*');
  expect(result[0]).property('id').a('string');
  return result[0];
}

module.exports = {
  register,
  registerAndLogin,
  clear,
  sendAndPend,
  addToken,
};
