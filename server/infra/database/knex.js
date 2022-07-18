require('dotenv').config();
const expect = require('expect-runtime');
const log = require('loglevel');
const knex = require('knex');
const connection = require('../../../config/config').connectionString;

expect(connection).to.match(/^postgresql:\//);

const knexConfig = {
  client: 'pg',
  debug: process.env.NODE_LOG_LEVEL === 'debug',
  connection,
  pool: {
    min: 0,
    max: 100,
    afterCreate(conn, done) {
      conn.query(
        'SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL SERIALIZABLE;',
        function (err) {
          if (err) {
            log.error(err);
            done(err, conn);
          } else {
            log.debug('SERIALIZABLE isolation level set successfully');
            done(err, conn);
          }
        },
      );
    },
  },
};

log.debug(process.env.DATABASE_SCHEMA);
if (process.env.DATABASE_SCHEMA) {
  log.info('setting a schema');
  knexConfig.searchPath = [process.env.DATABASE_SCHEMA];
}
log.debug(knexConfig.searchPath);

module.exports = knex(knexConfig);
