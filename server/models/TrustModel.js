const trust_relationship = require("./entities/trust_relationship");
const {Factory} = require('rosie');
const testFactory = Factory.define('test', trust_relationship);

class TrustModel{
  get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const instance = testFactory.build({id:1});
    return [instance];
  }
}

module.exports = TrustModel;
