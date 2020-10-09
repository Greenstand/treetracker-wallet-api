
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

module.exports = TrustRelationship;
