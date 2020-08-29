const trust_relationship = require("./entities/trust_relationship");

class TrustModel{
  get(){
    const trust_relationship_instance = new trust_relationship(1);
    return [trust_relationship_instance];
  }
}

module.exports = TrustModel;
