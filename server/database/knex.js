const expect = require('expect-runtime');
const connection = require('../../config/config').connectionString;
expect(connection).to.match(/^postgresql:\//);
const knex = require('knex')({
  client: 'pg',
  debug: process.env.NODE_LOG_LEVEL === "debug"? true:false,
  connection,
  searchPath: ['wallets', 'public'],
  pool: { min:0, max: 100},
});

module.exports = knex;
