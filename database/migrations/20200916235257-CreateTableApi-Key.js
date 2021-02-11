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
  return db.createTable('api_key', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    key: { type: 'string' },
    tree_token_api_access: { type: 'boolean' },
    hash: { type: 'string' },
    salt: { type: 'string' },
    name: { type: 'string' },
  });
};

exports.down = function(db) {
  return db.dropTable('api_key');
};

exports._meta = {
  "version": 1
};
