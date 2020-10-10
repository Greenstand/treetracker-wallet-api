const HttpError = require("../utils/HttpError");
//NOTE: currently, don't have model for trust, here just defined some fields 
//for this model
const TrustRelationship = {}

TrustRelationship.ENTITY_TRUST_TYPE = {
  send: "send",
  manage: "manage",
  deduct: "deduct",
}

TrustRelationship.ENTITY_TRUST_STATE_TYPE = {
  requested: "requested",
  cancelled_by_originator: "cancelled_by_originator",
  canceled_by_actor: "cancelled_by_actor",
  canceled_by_target: "cancelled_by_target",
  trusted: "trusted",
}

TrustRelationship.ENTITY_TRUST_REQUEST_TYPE = {
  send: "send",
  received: "received",
  manage: "manage",
  yield: "yield",
  deduct: "deduct",
  release: "release",
}

TrustRelationship.getTrustTypeByRequestType = function(requestType){
  switch(requestType){
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.received:
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send:{
      return TrustRelationship.ENTITY_TRUST_TYPE.send;
    }
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage:
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield:{
      return TrustRelationship.ENTITY_TRUST_TYPE.manage;
    }
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.deduct:
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.release:{
      return TrustRelationship.ENTITY_TRUST_TYPE.deduct;
    }
    default:{
      throw new HttpError(500, `Unknown request type:${requestType}`);
    }
  }
}

module.exports = TrustRelationship;
