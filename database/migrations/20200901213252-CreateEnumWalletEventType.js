let dbm;
let type;
let seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.runSql(
    "CREATE TYPE wallet_event_type AS ENUM ('trust_request', 'trust_request_granted', 'trust_request_cancelled_by_originator', 'trust_request_cancelled_by_actor', 'trust_request_cancelled_by_target', 'transfer_requested', 'transfer_request_cancelled_by_source', 'transfer_request_cancelled_by_destination', 'transfer_request_cancelled_by_originator', 'transfer_pending_cancelled_by_source', 'transfer_pending_cancelled_by_destination', 'transfer_pending_cancelled_by_requestor', 'transfer_completed', 'transfer_failed','login','wallet_created)",
  );
};

exports.down = function (db) {
  return db.runSql('DROP TYPE wallet_event_type');
};

exports._meta = {
  version: 1,
};
