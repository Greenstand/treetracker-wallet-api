import { HttpException, HttpStatus } from '@nestjs/common';

export enum ENTITY_TRUST_TYPE {
  send = 'send',
  manage = 'manage',
  deduct = 'deduct',
}

export enum ENTITY_TRUST_STATE_TYPE {
  requested = 'requested',
  cancelled_by_originator = 'cancelled_by_originator',
  cancelled_by_actor = 'cancelled_by_actor',
  cancelled_by_target = 'cancelled_by_target',
  trusted = 'trusted',
}

export enum ENTITY_TRUST_REQUEST_TYPE {
  send = 'send',
  receive = 'receive',
  manage = 'manage',
  yield = 'yield',
  deduct = 'deduct',
  release = 'release',
}

export function getTrustTypeByRequestType(
  requestType: ENTITY_TRUST_REQUEST_TYPE,
): ENTITY_TRUST_TYPE {
  switch (requestType) {
    case ENTITY_TRUST_REQUEST_TYPE.receive:
    case ENTITY_TRUST_REQUEST_TYPE.send:
      return ENTITY_TRUST_TYPE.send;

    case ENTITY_TRUST_REQUEST_TYPE.manage:
    case ENTITY_TRUST_REQUEST_TYPE.yield:
      return ENTITY_TRUST_TYPE.manage;

    case ENTITY_TRUST_REQUEST_TYPE.deduct:
    case ENTITY_TRUST_REQUEST_TYPE.release:
      return ENTITY_TRUST_TYPE.deduct;

    default:
      throw new HttpException(
        `Unknown request type: ${requestType}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
  }
}
