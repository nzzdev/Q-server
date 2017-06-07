const nano = require('nano')
var db;

module.exports.connect = function(config) {
  const dbUrl = `${config.protocol || 'https'}://${config.host}/${config.database}`;
  console.log(`Connecting to database ${dbUrl}`);
  db = nano({
    url: dbUrl,
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
