

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
  return db.runSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
};

exports.down = function(db, done) {
  // return db.runSql('DROP EXTENSION "uuid-ossp"');
  done()
};

exports._meta = {
  "version": 1
};
