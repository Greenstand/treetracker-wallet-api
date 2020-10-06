/*
 * seed data to DB for testing
 */
const pool = require('../server/database/database.js');
const uuid = require('uuid');
const log = require('loglevel');
const assert = require('assert');
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection: require('../config/config').connectionString,
});


const apiKey = 'FORTESTFORTESTFORTESTFORTESTFORTEST';
const wallet = {
  id: 10,
  name: 'fortest',
  password: 'test1234',
  passwordHash: '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const tree = {
  id: 999999,
};

const token = {
  id: 9,
  uuid: uuid.v4(),
};

const walletB = {
  id: 11,
  name: 'fortestB',
  password: 'test1234',
  passwordHash: '31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1',
  salt: 'TnDe2LDPS7VaPD9GQWL3fhG4jk194nde',
  type: 'p',
};

const storyOfThisSeed = `
    api_key: ${apiKey}
    a wallet: #${wallet.id}
      type: ${wallet.type}
      name: ${wallet.name}
      wallet: ${wallet.wallet}
      password: ${wallet.password}

    a tree: #${tree.id}

    a token: #${token.id}
      tree: #${tree.id}
      wallet: #${wallet.id}
      uuid: ${token.uuid}

    wallet #${wallet.id} planted a tree #${tree.id}, get a token #${token.id}

    another wallet: 
      ${JSON.stringify(walletB, undefined, 2)}
`;
console.debug(
'--------------------------story of database ----------------------------------',
storyOfThisSeed,
'-----------------------------------------------------------------------------',
);

async function seed() {
  log.debug('seed api key');
  //TODO should use appropriate hash & salt to populate this table
  await knex('wallets.api_key')
    .insert({
      key: apiKey,
      tree_token_api_access: true,
      hash: 'test',
      salt: 'test',
      name: 'test',
    });

  // wallet
  await knex('wallets.wallet')
    .insert({
      id: wallet.id,
      type: wallet.type,
      name: wallet.name,
      password: wallet.passwordHash,
      salt: wallet.salt,
    });

  //walletB
  await knex('wallets.wallet')
    .insert({
      id: walletB.id,
      type: walletB.type,
      name: walletB.name,
      password: walletB.passwordHash,
      salt: walletB.salt,
    });

  //entity
  await knex('entity')
    .insert({
      id: wallet.id,
      type: wallet.type,
      name: wallet.name,
      wallet: wallet.name,
      password: wallet.passwordHash,
      salt: wallet.salt,
    });


  //entity role
  log.debug('insert role');
  await knex('entity_role')
    .insert([{
      entity_id: wallet.id,
      role_name: 'list_trees',
      enabled: true,
    },{
      entity_id: wallet.id,
      role_name: 'manage_accounts',
      enabled: true,
    },{
      entity_id: wallet.id,
      role_name: 'accounts',
      enabled: true,
    }]);


  //tree
  await knex('trees')
    .insert({
      id: tree.id,
      time_created: new Date(),
      time_updated: new Date(),
    });


  // token
  log.log('seed token');
  await knex('wallets.token')
    .insert({
      id: token.id,
      tree_id: tree.id,
      entity_id: wallet.id,
      uuid: token.uuid,
    });
}

async function clear() {
  log.debug('clear tables');
  await knex('wallets.api_key').del();
  await knex('wallets.transaction').del();
  await knex('wallets.token').del();
  await knex('trees').del();
  await knex('wallets.wallet').del();
  await knex('wallets.entity_trust').del();
  await knex('entity_role').del();
  await knex('entity').del();
  await knex('wallets.entity_trust').del();
  await knex('wallets.transfer').del();
}

module.exports = {seed, clear, apiKey, wallet, walletB, tree, token};
