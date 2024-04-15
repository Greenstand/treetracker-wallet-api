export enum AuthEvents {
  Login = 'login',
}

export enum TransferEvents {
  TransferCompleted = 'transfer_completed',
  TransferRequested = 'transfer_requested',
  TransferRequestCancelledByDestination = 'transfer_request_cancelled_by_destination',
  TransferPendingCancelledByRequestor = 'transfer_pending_cancelled_by_requestor',
  TransferFailed = 'transfer_failed',
}

export enum TrustEvents {
  TrustRequest = 'trust_request',
  TrustRequestGranted = 'trust_request_granted',
  TrustRequestCancelledByTarget = 'trust_request_cancelled_by_target',
  TrustRequestCancelledByOriginator = 'trust_request_cancelled_by_originator',
}

export enum WalletEvents {
  WalletCreated = 'wallet_created',
}
