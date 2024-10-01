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
  // Commit the transaction if one is open, then run the ALTER TYPE statement.
  db.runSql('COMMIT;', [], function (err) {
    if (err) return callback(err);

    db.runSql(
      "ALTER TYPE wallet_event_type ADD VALUE IF NOT EXISTS 'login'",
      [],
      function (err) {
        if (err) return callback(err);
        callback();
      },
    );
  });
};

exports.down = function (db, callback) {
  // Rollback isn't possible as PostgreSQL doesn't support removing enum values
  callback();
};

exports._meta = {
  version: 1,
};
