

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
  return db.runSql("CREATE TYPE transfer_state AS ENUM ('requested', 'pending', 'completed', 'cancelled', 'failed')");
};

exports.down = function(db) {
  return db.runSql("DROP TYPE transfer_state");
};

exports._meta = {
  "version": 1
};
