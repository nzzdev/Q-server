const Confidence = require('confidence');

const tools = {
  
};

const env = process.env.APP_ENV || 'local';
const store = new Confidence.Store(tools);

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.get(key, criteria)
}

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.meta(key, criteria)
}
