export enum AUTH_EVENTS {
  login = 'login',
}

export enum TRANSFER_EVENTS {
  transfer_completed = 'transfer_completed',
  transfer_requested = 'transfer_requested',
  transfer_request_cancelled_by_destination = 'transfer_request_cancelled_by_destination',
  transfer_pending_cancelled_by_requestor = 'transfer_pending_cancelled_by_requestor',
  transfer_failed = 'transfer_failed',
}

export enum TRUST_EVENTS {
  trust_request = 'trust_request',
  trust_request_granted = 'trust_request_granted',
  trust_request_cancelled_by_target = 'trust_request_cancelled_by_target',
  trust_request_cancelled_by_originator = 'trust_request_cancelled_by_originator',
}

export enum WALLET_EVENTS {
  wallet_created = 'wallet_created',
}
