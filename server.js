const Hapi = require('hapi');

const server = new Hapi.Server();
server.connection({
      port: 3001
  });

module.exports = server;
