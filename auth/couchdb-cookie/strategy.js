const server = require('../../server.js').getServer();

const db = server.settings.app.misc.get('/db');

server.auth.strategy('q-auth', 'couchdb-cookie', {
  couchdbUrl: db.host
});
