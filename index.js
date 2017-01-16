const Hoek = require('hoek');
const Hapi = require('hapi');
const getServer = require('./server.js').getServer;
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
    port: options.config.misc.get('/port'),
    routes: {
      cors: {
        headers: ["Accept", "Authorization", "Content-Type", "If-None-Match", "Accept-language"]
      }
    }
  });

  server.ext('onPreHandler', function (request, reply) {
    if (request.params && request.params.target) {
      request.params.target = request.params.target.replace(new RegExp('-', 'g'), '_')
    }
    reply.continue();
  })

  const plugins = require('./server-plugins');
  const routes = require('./routes/routes');

  server.register(plugins, err => {
    Hoek.assert(!err, err);

    server.route(routes);

    callback(server)
  })
}

module.exports.start = function(callback) {
  let server = getServer();
  server.start(() => {
    console.log('server running: ', server.info.uri);
    if (callback) {
      callback(server.info);
    }
  })
}
