const expect = require('expect-runtime');
const connection = require('../../config/config').connectionString;
expect(connection).to.match(/^postgresql:\//);

let knexConfig = {
  client: 'pg',
  debug: process.env.NODE_LOG_LEVEL === "debug"? true:false,
  connection,
  pool: { min:0, max: 100},
}

if(process.env.DATABASE_SCHEMA){
  knexConfig.searchPath = [process.env.DATABASE_SCHEMA]
}

const knex = require('knex')(knexConfig);

module.exports = knex;
