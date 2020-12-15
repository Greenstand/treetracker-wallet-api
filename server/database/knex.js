const expect = require('expect-runtime');
const connection = require('../../config/config').connectionString;
expect(connection).to.match(/^postgresql:\//);
const log = require("loglevel");

let knexConfig = {
  client: 'pg',
  debug: process.env.NODE_LOG_LEVEL === "debug"? true:false,
  connection,
  pool: { min:0, max: 100},
}

log.debug('hello')
log.debug(process.env.DATABASE_SCHEMA)
if(process.env.DATABASE_SCHEMA){
  log.info('setting a schema')
  knexConfig.searchPath = ['wallets']
}
log.debug(knexConfig.searchPath)
log.debug(knexConfig.searchPath[0])

const knex = require('knex')(knexConfig);

module.exports = knex;
