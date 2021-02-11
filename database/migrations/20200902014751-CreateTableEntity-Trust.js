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
    id: { type: 'uuid', primaryKey: true, notNull: true },
    actor_entity_id: { type: 'int' },
    target_entity_id: { type: 'int', notNull: true },
    type: { type: 'entity_trust_type' },
    originator_entity_id: { type: 'int' },
    request_type: { type: 'entity_trust_request_type', notNull: true },
    state: { type: 'entity_trust_state_type' },
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
    active: { type: 'boolean' },
  });
};

exports.down = function(db) {
  return db.dropTable('entity_trust');
};

exports._meta = {
  "version": 1
};
