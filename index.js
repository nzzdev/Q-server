const Hoek = require('hoek');
const Hapi = require('hapi');
const getServer = require('./server.js').getServer;
const setServer = require('./server.js').setServer;
const connectDb = require('./db.js').connect;

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

module.exports.init = function(options = {hapi: {}, config: {}}, callbacks) {
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


  const plugins = require('./server-plugins');
  const routes = require('./routes/routes');

  server.register(plugins, async (err) => {
    Hoek.assert(!err, err);

    if (typeof callbacks === 'object' && callbacks['onBeforeRoutes']) {
      await callbacks['onBeforeRoutes'](server)
    }

    server.route(routes);

    if (typeof callbacks === 'object' && callbacks['onAfterRoutes']) {
      await callbacks['onAfterRoutes'](server)
    } else if (typeof callback === 'function') {
      callback(server);
    }
  });
}



module.exports.start = function(callback) {
  let server = getServer();

  connectDb(server.settings.app.misc.get('/db'));

  server.start(() => {
    console.log('server running: ', server.info.uri);
    if (callback) {
      callback(server.info);
    }
  })
}
