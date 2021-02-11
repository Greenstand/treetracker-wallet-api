'use strict';

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

exports.up = function(db) {
  return db.createTable('wallet', {
    id: { type: 'uuid', primaryKey: true, notNull: true },
    type: { type: 'string' },
    name: { type: 'string', notNull: true },
    first_name: { type: 'string' },
    last_name: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    pwd_reset_required: { type: 'boolean', defaultValue: false },
    website: { type: 'string' },
    password: { type: 'string' },
    salt: { type: 'string' },
    active_contract_id: { type: 'int' },
    offering_pay_to_plant: { type: 'boolean', defaultValue: false },
    tree_validation_contract_id: { type: 'int' },
    logo_url: { type: 'string' },
  });
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
