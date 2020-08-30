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

exports.up = function (db) {
  return db.createTable('token', {
    id: { type: 'int', primaryKey: true, autoincrement: true },
    tree_id: { type: 'int', notNull: true },
    entity_id: { type: 'int', notNull: true },
    uuid: {
      type: 'string',
      notNull: true,
      defaultValue: new String('uuid_generate_v4()'),
    },
    transfer_pending: { type: 'boolean', notNull: true, defaultValue: false },
    transfer_pending_id: { type: 'int' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()'),
    },
  });
};

exports.down = function (db) {
  return db.dropTable('token');
};

exports._meta = {
  "version": 1
};
