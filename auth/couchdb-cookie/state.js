const server = require('../../server.js').getServer();

const stateUserConfig = server.settings.app.misc.get('/authStrategy/couchdb_cookie/state');

let stateConfig = {
  isSecure: true,
  isHttpOnly: true,
  clearInvalid: true,
  strictHeader: true
};

stateConfig = Object.assign(stateConfig, stateUserConfig)

server.state('AuthSession', stateConfig);
