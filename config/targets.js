const Confidence = require('confidence');

const targets = {
  
};

const env = process.env.APP_ENV || 'local';
const store = new Confidence.Store(targets);

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
