/*
 * seed data to DB for testing
 */
const pool = require('../server/database/database.js');
const uuid = require('uuid');
const log = require('loglevel');
//log.setLevel('info');
const assert = require('assert');
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection: require('../config/config').connectionString,
});






const apiKey = 'FORTESTFORTESTFORTESTFORTESTFORTEST';
const entity = {
  id: 10,
  name: 'fortest',
  wallet: 'fortest',
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

const storyOfThisSeed = `
    api_key: ${apiKey}
    a entity: #${entity.id}
      type: ${entity.type}
      name: ${entity.name}
      wallet: ${entity.wallet}
      password: ${entity.password}

    a tree: #${tree.id}

    a token: #${token.id}
      tree: #${tree.id}
      entity: #${entity.id}
      uuid: ${token.uuid}

    entity #${entity.id} planted a tree #${tree.id}, get a token #${token.id}
`;
console.debug(
'--------------------------story of database ----------------------------------',
storyOfThisSeed,
'-----------------------------------------------------------------------------',
);

async function seed(){

  log.debug('seed api key');
  //TODO should use appropriate hash & salt to populate this talbel
  await knex('api_key')
    .insert({
      key: apiKey,
      tree_token_api_access: true,
      hash: 'test',
      salt: 'test',
      name: 'test',
    });

  //entity
  {
    await knex('entity')
      .where('id', entity.id)
      .del();
    await knex('entity')
      .insert({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        wallet: entity.wallet,
        password: entity.passwordHash,
        salt: entity.salt,
      });
  }

  //entity role
  {
    log.debug('clear role');
    await knex('entity_role')
      .insert([{
        entity_id: entity.id,
        role_name: 'list_trees',
        enabled: true,
      },{
        entity_id: entity.id,
        role_name: 'manage_accounts',
        enabled: true,
      },{
        entity_id: entity.id,
        role_name: 'accounts',
        enabled: true,
      }]);
  }

  //tree
  {
    await knex('trees')
      .insert({
        id: tree.id,
        time_created: new Date(),
        time_updated: new Date(),
      });
  }

  //token
  {
    log.log('seed token');
    await knex('token')
      .insert({
        id: token.id,
        tree_id: tree.id,
        entity_id: entity.id,
        uuid: token.uuid,
      });
  }
}

async function clear(){
  log.debug('clear all key');
  await knex('api_key').del();
  log.debug('clear all transaction');
  await knex('wallets.transaction').del();
  log.debug('clear all token');
  await knex('token').del();
  log.debug('clear all trees');
  await knex('trees').del();
  log.debug('clear all planter');
  await knex('planter').del();
  log.debug('clear all entity_role');
  await knex('entity_role').del();
  log.debug('clear all entity_manager');
  await knex('entity_manager').del();
  log.debug('clear all entity');
  await knex('entity').del();
}

module.exports = {seed, clear, apiKey, entity, tree, token};
