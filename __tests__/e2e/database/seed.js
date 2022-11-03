/*
 * seed data to DB for testing
 */
const log = require('loglevel');
const uuid = require('uuid');
const { v4: uuidV4 } = require('uuid');
const knex = require('./knex');

const apiKey = 'FORTESTFORTESTFORTESTFORTESTFORTEST';

const wallet = {
  id: uuid.v4(),
  name: 'walletA',
  password: 'test1234',
  passwordHash:
    '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const walletB = {
  id: uuid.v4(),
  name: 'walletB',
  password: 'test1234',
  passwordHash:
    '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const walletC = {
  id: uuid.v4(),
  name: 'walletC',
  password: 'test1234',
  passwordHash:
    '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const walletTrustD = {
  id: uuid.v4(),
  name: 'walletD',
  password: 'test1234',
  passwordHash:
    '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const walletTrustE = {
  id: uuid.v4(),
  name: 'walletE',
  password: 'test1234',
  passwordHash:
    '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const managingWallet = {
  id: uuid.v4(),
  name: 'managingWallet',
  password: 'test1234',
  passwordHash:
    '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const capture = {
  id: uuid.v4(),
};

const token = {
  id: uuid.v4(),
};

async function createTokens(targetWallet, numberOfTokens) {
  const tokenIds = [];
  for (let i = 0; i < numberOfTokens; i += 1) {
    const tokenId = uuidV4();
    await knex('token').insert({
      id: tokenId,
      capture_id: uuidV4(),
      wallet_id: targetWallet,
    });
    tokenIds.push(tokenId);
  }
  return tokenIds;
}

async function seed() {
  log.log('seed api key');
  await knex('api_key').insert({
    key: apiKey,
    tree_token_api_access: true,
    hash: 'test',
    salt: 'test',
    name: 'test',
  });

  // wallet
  await knex('wallet').insert({
    id: wallet.id,
    name: wallet.name,
    password: wallet.passwordHash,
    salt: wallet.salt,
  });

  // walletB
  await knex('wallet').insert({
    id: walletB.id,
    name: walletB.name,
    password: walletB.passwordHash,
    salt: walletB.salt,
  });

  // walletC
  await knex('wallet').insert({
    id: walletC.id,
    name: walletC.name,
    password: walletC.passwordHash,
    salt: walletC.salt,
  });

  // walletD
  await knex('wallet').insert({
    id: walletTrustD.id,
    name: walletTrustD.name,
    password: walletTrustD.passwordHash,
    salt: walletTrustD.salt,
  });

  // walletE
  await knex('wallet').insert({
    id: walletTrustE.id,
    name: walletTrustE.name,
    password: walletTrustE.passwordHash,
    salt: walletTrustE.salt,
  });

  // managing wallet
  await knex('wallet').insert({
    id: managingWallet.id,
    name: managingWallet.name,
    password: managingWallet.passwordHash,
    salt: managingWallet.salt,
  });

  // token
  log.log('seed token');

  await createTokens(wallet.id, 5);
  await createTokens(walletTrustD.id, 2);

  await knex('token').insert({
    id: token.id,
    capture_id: capture.id,
    wallet_id: wallet.id,
  });
}

async function clear(wallets) {
  log.log('clearing db');

  await knex('api_key').where('key', apiKey).del();

  await Promise.all(
    wallets.map(async (w) => {
      await knex('transaction').where('source_wallet_id', w).del();
    }),
  );

  await Promise.all(
    wallets.map(async (w) => {
      await knex('token').where('wallet_id', w).del();
    }),
  );

  await knex('wallet').where('name', wallet.name).del();
  await knex('wallet').where('name', walletB.name).del();
  await knex('wallet').where('name', walletC.name).del();
  await knex('wallet').where('name', walletTrustD.name).del();
  await knex('wallet').where('name', walletTrustE.name).del();
  await knex('wallet').where('name', managingWallet.name).del();

  await Promise.all(
    wallets.map(async (w) => {
      await knex('wallet_trust').where('actor_wallet_id', w).del();
    }),
  );

  log.log('done clearing db');
}

module.exports = {
  seed,
  clear,
  apiKey,
  wallet,
  walletB,
  walletC,
  walletTrustD,
  walletTrustE,
  managingWallet,
  capture,
  token,
};
