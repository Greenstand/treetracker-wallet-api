

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
  return db.runSql("CREATE TYPE entity_trust_request_type AS ENUM ('send', 'receive', 'manage', 'yield', 'deduct', 'release')");
};

exports.down = function(db) {
  return db.runSql("DROP TYPE entity_trust_request_type");
};

exports._meta = {
  "version": 1
};
