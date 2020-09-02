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
  return db.runSql("CREATE TYPE transfer_type AS ENUM ('send', 'deduct', 'managed')");
};

exports.down = function(db) {
  return db.runSql("DROP TYPE transfer_type");
};

exports._meta = {
  "version": 1
};
