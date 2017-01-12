const Hoek = require('hoek');
const Hapi = require('hapi');
const setServer = require('./server.js').setServer;

const defaultOptions = {
  cache: [
    {
      name: 'memoryCache',
      engine: require('catbox-memory'),
      options: {
        maxByteSize: 150000000
      }
    }
  ]
}

module.exports.init = function(options = {hapi: {}, config: {}}, callback) {
  let hapiOptions = Object.assign(
    defaultOptions,
    options.hapi, 
    {
      app: options.config
    }
  );
  
  let server = new Hapi.Server(hapiOptions);
  setServer(server);

  server.connection({
    port: options.port || 3000
  });

  const plugins = require('./server-plugins');
  const routes = require('./routes/routes');

  server.register(plugins, err => {
    Hoek.assert(!err, err);

    server.route(routes);

    server.start(() => {
      console.log('server running: ', server.info.uri);
      if (callback) {
        callback(server.info);
      }
    })
  })
}
