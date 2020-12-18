const { Pool, Client } = require('pg');
const config = require('../../config/config');


const pool = new Pool({
  connectionString: config.connectionString
});

pool.on('connect', (client) => {
  //console.log("connected", client);
});

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

module.exports = pool;
