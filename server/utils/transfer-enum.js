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

module.exports = TransferEnums;
