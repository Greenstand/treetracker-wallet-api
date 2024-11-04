let dbm;
let type;
let seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  // Add the cover_url column to the wallet table
  db.runSql(
    'ALTER TABLE wallet ADD COLUMN IF NOT EXISTS cover_url VARCHAR(255);',
    [],
    function (err) {
      if (err) return callback(err);
      callback();
    },
  );
};

exports.down = function (db, callback) {
  // Remove the cover_url column from the wallet table if rolling back
  db.runSql(
    'ALTER TABLE wallet DROP COLUMN IF EXISTS cover_url;',
    [],
    function (err) {
      if (err) return callback(err);
      callback();
    },
  );
};

exports._meta = {
  version: 1,
};
