

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
  return db.createTable('token', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    capture_id: { type: 'uuid', notNull: true },
    wallet_id: { type: 'uuid', notNull: true },
    transfer_pending: { type: 'boolean', notNull: true, defaultValue: false },
    transfer_pending_id: { type: 'uuid' },
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
