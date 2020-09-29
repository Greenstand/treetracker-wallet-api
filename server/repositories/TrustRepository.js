const knex = require('../../server/database/knex');
const expect = require("expect-runtime");
const HttpError = require("../utils/HttpError");

class TrustRepository{

  async get(){
    //const trust_relationship_instance = new trust_relationship(1);
    const list = await knex.select()
      .table("wallets.entity_trust");
    return list;
  }

  async getByOriginatorId(id){
    const list = await knex.select()
      .table("wallets.entity_trust")
      .where("originator_entity_id", id);
    return list;
  }

  async getByTargetId(id){
    const list = await knex.select()
      .table("wallets.entity_trust")
      .where("target_entity_id", id);
    return list;
  }

  async getTrustedByOriginatorId(id){
    const list = await knex.select()
      .table("wallets.entity_trust")
      .where({
        originator_entity_id: id,
        state: require("../models/TrustRelationship").ENTITY_TRUST_STATE_TYPE.trusted,
      });
    return list;
  }

  async getById(id){
    const list = await knex.select()
      .table("wallets.entity_trust")
      .where("id", id);
    expect(list, () => new HttpError(404, 'can not find the relationship')).lengthOf.above(0);
    expect(list, () => new HttpError(500, 'impossible, too many recodes')).lengthOf.most(1);
    return list[0];
  }

  async create(trustObject){
    await knex("wallets.entity_trust").insert(trustObject);
    //get the inserted object, TODO there must be better way to do so.
    const result = await knex("wallets.entity_trust").orderBy("id", "desc").limit(1);
    return result[0];
  }

  async update(trustObject){
    await knex("wallets.entity_trust").update(trustObject).where("id", trustObject.id);
  }
}


module.exports = TrustRepository;
