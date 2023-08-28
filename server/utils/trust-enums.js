const HttpError = require('./HttpError');

const TrustRelationshipEnums = {};

TrustRelationshipEnums.ENTITY_TRUST_TYPE = {
  send: 'send',
  manage: 'manage',
  deduct: 'deduct',
};

TrustRelationshipEnums.ENTITY_TRUST_STATE_TYPE = {
  requested: 'requested',
  cancelled_by_originator: 'cancelled_by_originator',
  canceled_by_actor: 'cancelled_by_actor',
  canceled_by_target: 'cancelled_by_target',
  trusted: 'trusted',
};

TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE = {
  send: 'send',
  receive: 'receive',
  manage: 'manage',
  yield: 'yield',
  deduct: 'deduct',
  release: 'release',
};

TrustRelationshipEnums.getTrustTypeByRequestType = requestType => {
  switch (requestType) {
    case TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.receive:
    case TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.send: {
      return TrustRelationshipEnums.ENTITY_TRUST_TYPE.send;
    }
    case TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.manage:
    case TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.yield: {
      return TrustRelationshipEnums.ENTITY_TRUST_TYPE.manage;
    }
    case TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.deduct:
    case TrustRelationshipEnums.ENTITY_TRUST_REQUEST_TYPE.release: {
      return TrustRelationshipEnums.ENTITY_TRUST_TYPE.deduct;
    }
    default: {
      throw new HttpError(500, `Unknown request type:${requestType}`);
    }
  }
};

module.exports = TrustRelationshipEnums;
