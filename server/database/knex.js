require('dotenv').config()
const log = require("loglevel");
const connection = require('../../config/config').connectionString;
const postgresPattern = /^postgresql:\//;

if (!postgresPattern.test(connection)) {
  throw new Error('invalid databases connection url received');
}

let knexConfig = {
  client: 'pg',
  debug: process.env.NODE_LOG_LEVEL === "debug"? true:false,
  connection,
  pool: { 
    min:0, 
    max: 100,
    afterCreate: function (conn, done) {
      conn.query('SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL SERIALIZABLE;', function (err) {
        if (err) {
          log.error(err)
          done(err, conn)
        } else {
          log.debug('SERIALIZABLE isolation level set successfully')
          done(err, conn)
        }
      });
    }
  },
}

log.debug(process.env.DATABASE_SCHEMA)
if(process.env.DATABASE_SCHEMA){
  log.info('setting a schema')
  knexConfig.searchPath = [process.env.DATABASE_SCHEMA]
}
log.debug(knexConfig.searchPath)

const knex = require('knex')(knexConfig);

module.exports = knex;
