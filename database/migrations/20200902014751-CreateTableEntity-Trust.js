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
  return db.createTable('entity_trust', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    actor_entity_id: { type: 'int', notNull: true },
    target_entity_id: { type: 'int', notNull: true },
    type: { type: 'entity_trust_type', notNull: true },
    originator_entity_id: { type: 'int', notNull: true },
    request_type: { type: 'entity_trust_request_type', notNull: true },
    state: { type: 'entity_trust_state_type', notNull: true },
    created_at: { 
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    },
    active: { type: 'boolean', notNull: true },
  });
};

exports.down = function(db) {
  return db.dropTable('entity_trust');
};

exports._meta = {
  "version": 1
};
