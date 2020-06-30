/*
 * seed data to DB for testing
 */
const pool = require('../server/database/database.js');
const uuid = require("uuid");
const log = require("loglevel");
log.setLevel("debug");
const assert = require("assert");

const apiKey = "FORTESTFORTESTFORTESTFORTESTFORTEST";
const entity = {
  id: 10,
  name: "fortest",
  wallet: "fortest",
  password: "test1234",
  passwordHash: "31dd4fe716e1a908f0e9612c1a0e92bfdd9f66e75ae12244b4ee8309d5b869d435182f5848b67177aa17a05f9306e23c10ba41675933e2cb20c66f1b009570c1",
  salt: "TnDe2LDPS7VaPD9GQWL3fhG4jk194nde",
  type: "p",
}

const tree = {
  id: 999999,
}

const token = {
  id: 9,
  uuid: uuid.v4(),
}

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
`
console.debug(
"--------------------------story of databse ----------------------------------",
storyOfThisSeed,
"-----------------------------------------------------------------------------",
);

async function seed(){

  console.log("clear api_key for test");
  await pool.query({
    text: `delete from api_key where key = $1`,
    values: [apiKey],
  });
  console.log("seed api key");
  //TODO should use appropriate hash & salt to populate this talbel
  await pool.query({
    text: `INSERT INTO api_key
    (key, tree_token_api_access, hash, salt, name)
    VALUES ($1, $2, $3, $4, $5)
    `,
    values: [apiKey, true, "test", "test", "test"]
  });

  //entity
  {
    log.info("clear entity");
    await pool.query(`delete from entity_role where entity_id = ${entity.id}`);
    let query = `delete from entity where id = ${entity.id}`;
    let result = await pool.query(query);
    assert(result);
    query = `insert into entity
    (id, type, name, wallet, password, salt)
    values (${entity.id}, '${entity.type}', '${entity.name}', '${entity.wallet}', '${entity.passwordHash}', '${entity.salt}')
    `;
    log.debug(query);
    result = await pool.query(query);
    assert(result);
  }

  //entity role
  {
    log.info("clear role");
    await pool.query(`delete from entity_role where entity_id = ${entity.id}`);
    await pool.query(
      `insert into entity_role
      (entity_id, role_name, enabled)
      values 
      (${entity.id}, 'list_trees', true),
      (${entity.id}, 'accounts', true)
      `
    );
  }

  //tree
  {
    log.info("clear tree");
    await pool.query(`delete from trees where id = ${tree.id}`);
    await pool.query({
      text: `insert into trees
      (id, time_created, time_updated)
      values (${tree.id}, $1, $1)
      `,
      values: [new Date()]
    });
  }

  //token
  {
    console.log("clear token first");
    await pool.query("delete from token");
    console.log("seed token");
    const query = {
      text: `INSERT into token
      (id, tree_id, entity_id, uuid)
      values ($1, $2, $3, $4)`,
      values: [token.id, tree.id, entity.id, token.uuid]
    };
    await pool.query(query);
  }
}

async function clear(){
  console.log("clear token first");
  await pool.query("delete from token");
}

module.exports = {seed, clear, apiKey, entity, tree, token};
