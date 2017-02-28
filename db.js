const nano = require('nano')
var db;

module.exports.connect = function(config) {
  console.log(`Connecting to database https://${config.host}/${config.database}`);
  db = nano({
    url: `https://${config.host}/${config.database}`,
    requestDefaults: {
      auth: {
        user: config.user,
        pass: config.pass
      }
    }
  })
}

module.exports.getDb = function() {
  return db;
}
