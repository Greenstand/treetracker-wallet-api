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
  return db.removeColumn("entity_trust", "id")
    .then(function(){
      return db.addColumn("entity_trust", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
    .then(function(){
      return db.removeColumn("transaction", "id");
    })
    .then(function(){
      return db.addColumn("transaction", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
    .then(function(){
      return db.removeColumn("token", "id");
    })
    .then(function(){
      return db.addColumn("token", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
    .then(function(){
      return db.removeColumn("transfer", "id");
    })
    .then(function(){
      return db.addColumn("transfer", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
    .then(function(){
      return db.removeColumn("wallet_event", "id");
    })
    .then(function(){
      return db.addColumn("wallet_event", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
    .then(function(){
      return db.removeColumn("entity_trust_log", "id");
    })
    .then(function(){
      return db.addColumn("entity_trust_log", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
    .then(function(){
      return db.removeColumn("transfer_audit", "id");
    })
    .then(function(){
      return db.addColumn("transfer_audit", "id", {
        type: 'int', 
        primaryKey: true, 
        autoIncrement: true });
    })
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
