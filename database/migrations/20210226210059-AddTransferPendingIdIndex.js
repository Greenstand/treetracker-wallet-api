

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
    return db.runSql('create index token_transfer_pending_id_idx on token(transfer_pending_id)');
};

exports.down = function(db) {
    return db.runSql('drop index token_transfer_pending_id_idx');
};


exports._meta = {
  "version": 1
};
