export enum EVENT_TYPES {
  // AUTH_EVENTS
  login = 'login',

  // TRANSFER_EVENTS
  transfer_completed = 'transfer_completed',
  transfer_requested = 'transfer_requested',
  transfer_request_cancelled_by_destination = 'transfer_request_cancelled_by_destination',
  transfer_request_cancelled_by_source = 'transfer_request_cancelled_by_source',
  transfer_request_cancelled_by_originator = 'transfer_request_cancelled_by_originator',
  transfer_pending_cancelled_by_source = 'transfer_pending_cancelled_by_source',
  transfer_pending_cancelled_by_destination = 'transfer_pending_cancelled_by_destination',
  transfer_pending_cancelled_by_requestor = 'transfer_pending_cancelled_by_requestor',
  transfer_failed = 'transfer_failed',

  // TRUST_EVENTS
  trust_request = 'trust_request',
  trust_request_granted = 'trust_request_granted',
  trust_request_cancelled_by_target = 'trust_request_cancelled_by_target',
  trust_request_cancelled_by_originator = 'trust_request_cancelled_by_originator',
  trust_request_cancelled_by_actor = 'trust_request_cancelled_by_actor',

  // WALLET_EVENTS
  wallet_created = 'wallet_created',
}
