const Hapi = require('hapi');

var hapiOptions = {
  cache: [
    {
      name: 'memoryCache',
      engine: require('catbox-memory'),
      options: {
        maxByteSize: 150000000
      }
    }
  ]
};

const server = new Hapi.Server(hapiOptions);
server.connection({
      port: 3001
  });

module.exports = server;
