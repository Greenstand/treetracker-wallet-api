
class Transfer{
}

Transfer.TYPE = {
  send: "send",
  deduct: "deduct",
  managed: "managed",
}

Transfer.STATE = {
  requested: "requested",
  pending: "pending",
  completed: "completed",
  cancelled: "cancelled",
  failed: "failed",
}

module.exports = Transfer;
