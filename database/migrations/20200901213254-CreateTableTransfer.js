

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

exports.up = function (db) {
  return db.createTable('transfer', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    originator_wallet_id: { type: 'uuid', notNull: true },
    source_wallet_id: { type: 'uuid', notNull: true },
    destination_wallet_id: { type: 'uuid', notNull: true },
    type: { type: 'transfer_type', notNull: true },
    parameters: { type: 'json' },
    state: { type: 'transfer_state', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    },
    closed_at: {
      type: 'timestamp',
      notNull: true,
      defaultValue: new String('now()')
    },
    active: { type: 'boolean', notNull: true },
  });
};

exports.down = function (db) {
  return db.dropTable('transfer');
};

exports._meta = {
  "version": 1
};
