const expect = require('expect-runtime');
const connection = require('../../config/config').connectionString;
expect(connection).to.match(/^postgresql:\//);
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection,
  searchPath: ['wallets', 'public'],
});

module.exports = knex;
