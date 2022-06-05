const HttpError = require('../utils/HttpError');
const TrustRelationship = {};

TrustRelationship.ENTITY_TRUST_TYPE = {
  send: 'send',
  manage: 'manage',
  deduct: 'deduct',
};

TrustRelationship.ENTITY_TRUST_STATE_TYPE = {
  requested: 'requested',
  cancelled_by_originator: 'cancelled_by_originator',
  canceled_by_actor: 'cancelled_by_actor',
  canceled_by_target: 'cancelled_by_target',
  trusted: 'trusted',
};

TrustRelationship.ENTITY_TRUST_REQUEST_TYPE = {
  send: 'send',
  receive: 'receive',
  manage: 'manage',
  yield: 'yield',
  deduct: 'deduct',
  release: 'release',
};

TrustRelationship.getTrustTypeByRequestType = function (requestType) {
  switch (requestType) {
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.receive:
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.send: {
      return TrustRelationship.ENTITY_TRUST_TYPE.send;
    }
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.manage:
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.yield: {
      return TrustRelationship.ENTITY_TRUST_TYPE.manage;
    }
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.deduct:
    case TrustRelationship.ENTITY_TRUST_REQUEST_TYPE.release: {
      return TrustRelationship.ENTITY_TRUST_TYPE.deduct;
    }
    default: {
      throw new HttpError(500, `Unknown request type:${requestType}`);
    }
  }
};

module.exports = TrustRelationship;
