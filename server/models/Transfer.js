const _ = require("lodash");

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

Transfer.hasCompleted = function(transferJson){
  return transferJson.state === Transfer.STATE.completed;
}

Transfer.isImpactValue = function(transferJson){
  return (
      _.has(transferJson, "parameters.impact.value") &&
      _.has(transferJson, "parameters.impact.accept_deviation")
  );
}

module.exports = Transfer;
