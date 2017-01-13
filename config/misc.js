const Confidence = require('confidence');

const misc = {
  port: 3001,
  cache: {
    serverCacheTime: 1000,
    cacheControl: {
      maxAge: 60
    }
  }
}

const env = process.env.APP_ENV || 'local';
const store = new Confidence.Store(misc);

module.exports.get = (key) => {
  return store.get(key, {
    env: env
  })
}

module.exports.meta = (key) => {
  return store.meta(key, {
    env: env
  })
}
