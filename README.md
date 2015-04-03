# redisp

[![Build Status](https://travis-ci.org/rogermadjos/redisp.svg)](https://travis-ci.org/rogermadjos/redisp)

## How to install

```
npm install redisp --save
```

`redisp` is a `connection factory` for [redis](https://www.npmjs.com/package/redis) with a built-in support for [pooling](http://en.wikipedia.org/wiki/Pool_%28computer_science%29).

## How to use
```js
var pool = require('redisp')();

//creates a dedicated client connection
pool.create(function(err, conn) {

});

//retrieves a client connection from the pool
pool.borrow(function(err, conn) {
  //operations here
  conn.release(); //return this client connection into the pool
});

```

## Options
```js
var pool = require('redisp')(opts);
```
List of available options:
- `host`: host to connect redis on (`127.0.0.1`)
- `port`: port to connect redis on (`6379`)
- `password`: password used in authentication (`''`)
- `maxConnections`: maximum number of connections that can be held in the connection pool. If `maxConnections` is reached, new calls to `pool.borrow` will be blocked until a client connection is released.

All other options are the same as in [redis](https://www.npmjs.com/package/redis).


## License

MIT
