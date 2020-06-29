/*
 * seed data to DB for testing
 */
const pool = require('../server/database/database.js');
const uuid = require("uuid");

const apiKey = "FORTESTFORTESTFORTESTFORTESTFORTEST";
const uuidA = uuid.v4();

const storyOfThisSeed = `
    api_key: ${apiKey}
    a tree: #1
    a token: #1
      uuid: ${uuidA}
    a entity: #3
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

  console.log("clear token first");
  await pool.query("delete from token");
  console.log("seed token");
  const query = {
    text: `INSERT into token
    (id, tree_id, entity_id, uuid)
    values ($1, $2, $3, $4)`,
    values: [1, 1, 3, uuidA]
  };
  await pool.query(query);
}

async function clear(){
  console.log("clear token first");
  await pool.query("delete from token");
}

module.exports = {seed, clear, apiKey};
