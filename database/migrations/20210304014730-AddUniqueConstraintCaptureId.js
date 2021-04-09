

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
  return db.runSql('create unique index capture_id_idx on token(capture_id)');
};

exports.down = function(db) {
  return db.runSql('drop index capture_id_idx');
};

exports._meta = {
  "version": 1
};
