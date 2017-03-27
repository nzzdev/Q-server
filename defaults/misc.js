const Confidence = require('confidence');

const misc = {
  port: 3001,
  cache: {
    serverCacheTime: 1,
    cacheControl: 1
  },
  logging: {
    good: {
      options: {
        reporters: {
          consoleReporter: [
            {
              module: 'good-squeeze',
              name: 'Squeeze',
              args: [{ log: '*', 'request-error': '*' }]
            }, {
              module: 'good-console',
              args: [{ format: '', utc: false }]
            },
            'stdout'
          ]
        }
      }
    }
  },
  toolRuntimeConfig: {}
}

const store = new Confidence.Store(misc);

module.exports.get = (key) => {
  return store.get(key)
}

module.exports.meta = (key) => {
  return store.meta(key)
}
