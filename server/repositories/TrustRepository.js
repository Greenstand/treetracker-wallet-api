const HttpError = require("../utils/HttpError");
const BaseRepository = require("./BaseRepository");
const expect = require("expect-runtime");
const Session = require("../models/Session");

class TrustRepository extends BaseRepository{
  constructor(session){
    super("wallet_trust", session);
    this._tableName = "wallet_trust";
    this._session = session;
  }

  async get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = await this._session.getDB().select()
      .table(this._tableName);
    return list;
  }

  async getByOriginatorId(id){
    const list = await this._session.getDB().select()
      .table(this._tableName)
      .where("originator_entity_id", id);
    return list;
  }

  async getByTargetId(id){
    const list = await this._session.getDB().select()
      .table(this._tableName)
      .where("target_entity_id", id);
    return list;
  }

  async getTrustedByOriginatorId(id){
    const list = await this._session.getDB().select()
      .table(this._tableName)
      .where({
        originator_entity_id: id,
        state: require("../models/TrustRelationship").ENTITY_TRUST_STATE_TYPE.trusted,
      });
    return list;
  }

}


module.exports = TrustRepository;
