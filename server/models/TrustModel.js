const trust_relationship = require("./entities/trust_relationship");
const knex = require('knex')({
  client: 'pg',
//  debug: true,
  connection: require('../../config/config').connectionString,
});

class TrustModel{
  get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = knex.select()
      .table("trust_relationship");
    return list;
  }
}

module.exports = TrustModel;
