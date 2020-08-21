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
  return db.createTable('trading.transaction', {
    id: { type: 'int', primaryKey: true, autoincrement: true },
    token_id: { type: 'int', notNull: true },
    transfer_id: { type: 'int', notNull: true },
    source_entity_id: { type: 'int', notNull: true },
    destination_entity_id: { type: 'int', notNull: true },
    processed_at:  {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    }
  })
};

exports.down = function(db) {
  return db.dropTable('trading.transaction')
};

exports._meta = {
  "version": 1
};
