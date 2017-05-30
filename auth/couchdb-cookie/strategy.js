const server = require('../../server.js').getServer();

let dbUrl = server.settings.app.misc.get('/authStrategy/couchdb_cookie/db/host');
if (!dbUrl) {
  dbUrl = server.settings.app.misc.get('/authStrategy/couchdb_cookie/couchdbHost');
}

if (!dbUrl.startsWith('http')) {
  dbUrl = `${server.settings.app.misc.get('/authStrategy/couchdb_cookie/db/protocol') || 'https'}://${dbUrl}`;
}

server.auth.strategy('q-auth', 'couchdb-cookie', {
  couchdbUrl: dbUrl
});
