'use strict';

var dbm;
var type;
var seed;

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
    `ALTER TYPE wallet_event_type ADD VALUE 'login';
    ALTER TYPE wallet_event_type ADD VALUE 'wallet_created';`,
  );
};

exports.down = function (db) {
  return db.runSql(`
  CREATE TYPE wallet_event_type_original AS ENUM ('trust_request', 'trust_request_granted', 'trust_request_cancelled_by_originator', 'trust_request_cancelled_by_actor', 'trust_request_cancelled_by_target', 'transfer_requested', 'transfer_request_cancelled_by_source', 'transfer_request_cancelled_by_destination', 'transfer_request_cancelled_by_originator', 'transfer_pending_cancelled_by_source', 'transfer_pending_cancelled_by_destination', 'transfer_pending_cancelled_by_requestor', 'transfer_completed', 'transfer_failed');
  ALTER TABLE wallet_event
  ALTER COLUMN type TYPE wallet_event_type_original USING wallet_event_type::text::wallet_event_type_original;
  DROP TYPE wallet_event_type;
  ALTER TYPE wallet_event_type_original RENAME TO wallet_event_type;
`);
};

exports._meta = {
  version: 1,
};
