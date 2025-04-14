

let dbm;
let type;
let seed;

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
  return db.createTable('transfer_audit', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    transfer_id: { type: 'int', notNull: true },
    new_state: { type: 'transfer_state', notNull: true },
    processed_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    },
    approval_type: { type: 'transfer_state_change_approval_type', notNull: true },
    entity_trust_id: { type: 'int', notNull: true },
  });
};

exports.down = function(db) {
  return db.dropTable('transfer_audit');
};

exports._meta = {
  "version": 1
};
