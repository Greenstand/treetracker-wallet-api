export enum TRANSFER_TYPES {
  send = 'send',
  deduct = 'deduct',
  managed = 'managed',
}

export enum TRANSFER_STATES {
  requested = 'requested',
  pending = 'pending',
  completed = 'completed',
  cancelled = 'cancelled',
  failed = 'failed',
}

export enum TRANSFER_SORT_FIELDS {
  id = 'id',
  source_wallet_id = 'source_wallet_id',
  destination_wallet_id = 'destination_wallet_id',
  originator_wallet_id = 'originator_wallet_id',
  created_at = 'created_at',
  closed_at = 'closed_at',
  state = 'state',
}
