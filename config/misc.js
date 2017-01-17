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

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.get(key, criteria)
}

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.meta(key, criteria)
}
