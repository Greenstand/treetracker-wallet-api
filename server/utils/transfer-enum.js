const TransferEnums = {};

TransferEnums.TYPE = {
  send: 'send',
  deduct: 'deduct',
  managed: 'managed',
};

TransferEnums.STATE = {
  requested: 'requested',
  pending: 'pending',
  completed: 'completed',
  cancelled: 'cancelled',
  failed: 'failed',
};

TransferEnums.SORT = {
  id: 'id',
  source_wallet_id: 'source_wallet_id',
  destination_wallet_id: 'destination_wallet_id',
  originator_wallet_id: 'originator_wallet_id',
  created_at: 'created_at',
  close_at: 'closed_at',
  state: 'state',
};

module.exports = TransferEnums;
