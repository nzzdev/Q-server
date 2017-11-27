const Confidence = require('confidence');

const base = {
  cache: {
    cacheControl: { // these are the default cache-control headers used for the tool-default route in case a tool is not responding with it's own directives.
      maxAge: 1,
      sMaxAge: 1,
      staleWhileRevalidate: 1,
      staleIfError: 1
    }
  }
}

const env = process.env.APP_ENV || 'local';
const store = new Confidence.Store(base);

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.get(key, criteria)
}

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.meta(key, criteria)
}
