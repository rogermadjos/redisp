/*jshint node:true */
/*global describe, it, before, beforeEach, after, afterEach */
'use strict';

var expect = require('chai').expect;
var RedisPool = require('../index');
var async  = require('async');
var _ = require('lodash');

describe('Redis Pool', function() {

  describe('getConnection', function() {
    it('should get new redis connection given correct config', function(done) {
      var pool = new RedisPool();
      pool.create(function(err, conn) {
        if(err) return done(err);
        expect(conn.connected).to.be.ok;
        done();
      });
    });

    it('should NOT get new redis connection given incorrect config', function(done) {
      var pool = new RedisPool({
        port: 6378
      });
      pool.create(function(err, conn) {
        expect(conn).to.be.undefined;
        expect(err).to.be.ok;
        done();
      });
    });
  });

  describe('borrow', function() {
    it('should return a redis connection', function(done) {
      var pool = new RedisPool();
      pool.borrow(function(err, conn) {
        if(err) return done(err);
        expect(conn.connected).to.be.ok;
        expect(pool.inUseConnections.length).to.be.equal(1);
        done();
      });
    });

    it('should NOT return a redis connection', function(done) {
      var pool = new RedisPool({
        port: 6378
      });
      pool.borrow(function(err, conn) {
        expect(conn).to.be.undefined;
        expect(err).to.be.ok;
        expect(pool.inUseConnections.length).to.be.equal(0);
        done();
      });
    });
  });

  describe('release', function() {
    it('should return redis connection to pool', function(done) {
      var pool = new RedisPool();
      pool.borrow(function(err, conn) {
        if(err) return done(err);
        expect(conn.connected).to.be.ok;
        expect(pool.availableConnections.length).to.be.equal(0);
        expect(pool.inUseConnections.length).to.be.equal(1);
        conn.release();
        expect(pool.inUseConnections.length).to.be.equal(0);
        expect(pool.availableConnections.length).to.be.equal(1);
        var conn_id = conn.connection_id;
        pool.borrow(function(err, conn) {
          expect(conn.connection_id).to.be.equal(conn_id);
          done();
        });
      });
    });

    it('should block new connection requests', function(done) {
      this.timeout(3000);
      var pool = new RedisPool();
      async.times(pool.maxConnections, function(index, callback) {
        pool.borrow(callback);
      }, function(err, results) {
        if(err) return done(err);
        expect(pool.inUseConnections.length).to.equal(pool.maxConnections);
        expect(_.uniq(_.map(results, function(conn) {
          return conn.connection_id;
        })).length).to.be.equal(pool.maxConnections);
        var timestamp = Date.now();
        var conn_id;
        pool.borrow(function(err, conn) {
          if(err) return done(err);
          expect(Date.now() - timestamp).within(1000, 2000);
          expect(conn.connection_id).to.equal(conn_id);
          done();
        });
        setTimeout(function() {
          var conn = results.shift();
          conn_id = conn.connection_id;
          conn.release();
        }, 1500);
      });
    });
  });

  describe('stress', function() {
    it('should', function(done) {
      this.timeout(10000);
      var pool = new RedisPool();
      async.timesSeries(250, function(index, callback) {
        setTimeout(function() {
          pool.borrow(function(err, conn) {
            callback(err);
            setTimeout(function() {
              conn.release();
            }, Math.random() * 50);
          });
        }, Math.random() * 50);
      }, done);
    });
  });
});
