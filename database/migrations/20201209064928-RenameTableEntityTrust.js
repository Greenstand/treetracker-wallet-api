'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.renameTable("entity_trust", "wallet_trust");
};

exports.down = function(db) {
  return db.renameTable("wallet_trust", "entity_trust");
};

exports._meta = {
  "version": 1
};
