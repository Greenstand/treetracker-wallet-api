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
  return db.createTable('wallet_event', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    entity_id: { type: 'int', notNull: true },
    type: { type: 'wallet_event_type', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()'),
    },
  });
};

exports.down = function(db) {
  return db.dropTable('wallet_event');
};

exports._meta = {
  "version": 1
};
