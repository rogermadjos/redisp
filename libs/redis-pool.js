/*jshint node:true */
'use strict';

var redis = require('redis');
var _ = require('lodash');
var debug = require('debug');
var async = require('async');

var loggers = {
  connection: debug('redisp:connection'),
  borrow: debug('redisp:borrow')
};

function RedisPool(options) {
  options = options || {};
  this.host = options.host || '127.0.0.1';
  this.port = options.port || '6379';
  this.password = options.password || '';
  this.maxConnections = options.maxConnections || 10;
  this.options = _.omit(options, ['host', 'port', 'password', 'maxConnections']);
  this.availableConnections = [];
  this.inUseConnections = [];

  var self = this;
  this.queue = async.queue(function(req, callback) {
    loggers.borrow('available: %d, in_use: %d, max_connections: %d',
      self.availableConnections.length,
      self.inUseConnections.length,
      self.maxConnections);
    var conn;
    if(self.availableConnections.length > 0) {
      conn = self.availableConnections.shift();
      if(conn.connected) {
        self.inUseConnections.push(conn);
        req(null, conn);
        callback();
      }
      else {
        conn.end();
        conn.release = null;
        setTimeout(function() {
          self.queue.unshift(req);
        }, 225 + Math.random()*50);
        callback();
      }
    }
    else if(self.inUseConnections.length < self.maxConnections) {
      self.create(function(err, conn) {
        if(err) {
          req(err);
          return callback();
        }
        conn.release = function() {
          self.inUseConnections = _.filter(self.inUseConnections, function(c) {
            return c.connection_id !== conn.connection_id;
          });
          if(conn.connected) {
            self.availableConnections.push(conn);
          }
          else {
            conn.end();
            conn.release = null;
          }
        };
        self.inUseConnections.push(conn);
        req(null, conn);
        callback();
      });
    }
    else {
      setTimeout(function() {
        self.queue.unshift(req);
      }, 225 + Math.random()*50);
      callback();
    }
  },1);
}

RedisPool.prototype.borrow = function(req) {
  this.queue.push(req);
};

RedisPool.prototype.create = function(callback) {
  callback = _.once(callback);
  var client = redis.createClient(this.port, this.host, this.options);
  var onConnect = function() {
    client.on('error', function(err) {
      loggers.connection(err);
      client.end();
    });
    loggers.connection('created: %d', client.connection_id);
    callback(null, client);
  };
  client.once('ready', onConnect);
  client.once('error', function(err) {
    loggers.connection(err);
    client.end();
    client.removeListener('connect', onConnect);
    callback(err);
  });
  client.auth(this.password);
};

module.exports = function(opts) {
  return new RedisPool(opts);
};

module.exports.RedisPool = RedisPool;
