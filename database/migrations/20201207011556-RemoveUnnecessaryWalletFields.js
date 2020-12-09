'use strict';

var async = require('async');

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db, callback) {
    async.series([
      db.removeColumn.bind(db,'wallet', 'first_name'),
      db.removeColumn.bind(db,'wallet', 'last_name'),
      db.removeColumn.bind(db,'wallet', 'pwd_reset_required'),
      db.removeColumn.bind(db,'wallet', 'website'),
      db.removeColumn.bind(db,'wallet', 'active_contract_id'),
      db.removeColumn.bind(db,'wallet', 'offering_pay_to_plant'),
      db.removeColumn.bind(db,'wallet', 'tree_validation_contract_id')
    ],
      callback
    )
};

exports.down = function(db, callback) {
    async.series([
      db.addColumn.bind(db,'wallet', 'first_name', 'text'),
      db.addColumn.bind(db,'wallet', 'last_name', 'text'),
      db.addColumn.bind(db,'wallet', 'pwd_reset_required', 'text'),
      db.addColumn.bind(db,'wallet', 'website', 'text'),
      db.addColumn.bind(db,'wallet', 'active_contract_id', 'text'),
      db.addColumn.bind(db,'wallet', 'offering_pay_to_plant', 'boolean'),
      db.addColumn.bind(db,'wallet', 'tree_validation_contract_id', 'int')
    ],
      callback
    )
};

exports._meta = {
  "version": 1
};
