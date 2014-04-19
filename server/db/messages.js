'use strict';
var config = require(__dirname + '/../config');
var _ = require('lodash');
var nano = require('nano')(config.couchdb.url);
var messages = {};
var dbName = config.couchdb.dbName;
var recordType = 'messages';
var couch = nano.use(config.couchdb.dbName);

module.exports = messages;

messages.all = function(limit, startkey, cb) {
  var filter = {};
  filter.limit = limit ? Number(limit) : 10;
  if (startkey) filter.startkey = startkey;
  console.log(dbName + ' ' + recordType);
  couch.view(dbName, recordType, filter, function(err, result) {
    delete result.total_rows;
    result.next_startkey = result.rows[result.rows.length - 1].key;
    result.next_startkey_docid = result.rows[result.rows.length - 1].id; 
    result.rows = _.first(result.rows, filter.limit - 1);
    cb(err, result);
  });
};

messages.find = function(messageId, cb) {
  console.log('message find: ' + messageId);
  var filter = {};
  filter.limit = 1;
  filter.key = Number(messageId);
  couch.view(dbName, recordType, filter, function(err, result) {
    if (!err && result.rows && result.rows.length > 0) {
      return cb(err, result.rows[0].value);
    }
    return cb(err, undefined);
  });
};

