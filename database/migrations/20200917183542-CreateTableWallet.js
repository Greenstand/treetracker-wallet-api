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
  return db.createTable('wallet', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    name: { type: 'string', notNull: true },
    password: { type: 'string' },
    salt: { type: 'string' },
    logo_url: { type: 'string' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()'),
    },
  });
};

exports.down = function (db) {
  return db.dropTable('wallet');
};

exports._meta = {
  version: 1,
};
