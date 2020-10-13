const HttpError = require("../utils/HttpError");
const BaseRepository = require("./BaseRepository");
const expect = require("expect-runtime");
const Session = require("../models/Session");

class TrustRepository extends BaseRepository{
  constructor(session){
    expect(session).instanceOf(Session);
    super("wallets.entity_trust", session);
    this._session = session;
  }

  async get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = await this._session.getDB().select()
      .table("wallets.entity_trust");
    return list;
  }

  async getByOriginatorId(id){
    const list = await this._session.getDB().select()
      .table("wallets.entity_trust")
      .where("originator_entity_id", id);
    return list;
  }

  async getByTargetId(id){
    const list = await this._session.getDB().select()
      .table("wallets.entity_trust")
      .where("target_entity_id", id);
    return list;
  }

  async getTrustedByOriginatorId(id){
    const list = await this._session.getDB().select()
      .table("wallets.entity_trust")
      .where({
        originator_entity_id: id,
        state: require("../models/TrustRelationship").ENTITY_TRUST_STATE_TYPE.trusted,
      });
    return list;
  }

  async create(trustObject){
    await this._session.getDB()("wallets.entity_trust").insert(trustObject);
    //get the inserted object, TODO there must be better way to do so.
    const result = await this._session.getDB()("wallets.entity_trust").orderBy("id", "desc").limit(1);
    return result[0];
  }

  async update(trustObject){
    await this._session.getDB()("wallets.entity_trust").update(trustObject).where("id", trustObject.id);
  }
}


module.exports = TrustRepository;
