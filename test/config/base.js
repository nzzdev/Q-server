const Confidence = require('confidence');

const base = {
  cache: {
    cacheControl: { // these are the default cache-control headers used for the tool-default route in case a tool is not responding with it's own directives.
      maxAge: {
        $filter: 'env',
        local: 1,
        $default: 60
      },
      sMaxAge: {
        $filter: 'env',
        local: 1,
        $default: 60
      },
      staleWhileRevalidate: { // this is just for the CDN, it will serve maximum 24 hours old content while revalidating in the background
        $filter: 'env',
        local: 1,
        $default: 60 * 60 * 24
      },
      staleIfError: {  // this is just for the CDN, it will serve maximum 7 days old content if the backend is not running
        $filter: 'env',
        local: 1,
        $default: 60 * 60 * 24 * 7
      }
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
