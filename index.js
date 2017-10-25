const Hoek = require('hoek');
const Hapi = require('hapi');
const getServer = require('./server.js').getServer;
const setServer = require('./server.js').setServer;
const connectDb = require('./db.js').connect;

const defaults = {
  misc: require('./defaults/misc.js')
}

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

module.exports.init = async function(options = {hapi: {}, config: {}}, callbacks) {
  let hapiOptions = Object.assign(
    defaultOptions,
    options.hapi, 
    {
      app: options.config
    }
  );
  
  let server = new Hapi.Server(hapiOptions);
  setServer(server);

  connectDb(server.settings.app.misc.get('/db'));

  server.connection({
    port: options.config.misc.get('/port'),
    routes: {
      cors: {
        headers: ["Accept", "Authorization", "Content-Type", "If-None-Match", "Accept-language"]
      }
    }
  });

  if (typeof callbacks === 'object' && callbacks['onBeforePlugins']) {
    await callbacks['onBeforePlugins'](server)
  }

  let plugins = require('./server-plugins');
  
  // if couchdb-cookie-auth-strategy is enabled, we load the required plugin
  const couchdbCookieStrategy = options.config.misc.get('/authStrategy/couchdb_cookie');
  if (couchdbCookieStrategy) {
    plugins = plugins.concat(require('./auth/couchdb-cookie/plugins'));
  }

  // add good logging if configured
  const loggingConfig = Object.assign(defaults.misc.get('/logging'), options.config.misc.get('/logging'));
  if (loggingConfig.good && loggingConfig.good.options) {
    plugins = plugins.concat({
      register: require('good'),
      options: loggingConfig.good.options
    })
  }

  if (server.settings.plugins.hasOwnProperty('q-screenshot')) {
    plugins = plugins.concat(require('./plugins/q-screenshot/index.js'));
  }

  server.register(plugins, async (err) => {
    try {
      Hoek.assert(!err, err);

      if (typeof callbacks === 'object' && callbacks['onBeforeRoutes']) {
        await callbacks['onBeforeRoutes'](server)
      }

      // register the auth strategy if any
      if (couchdbCookieStrategy) {
        require('./auth/couchdb-cookie/strategy');
        require('./auth/couchdb-cookie/state');
        server.route(require('./auth/couchdb-cookie/routes'));
      }

      let routes = require('./routes/routes').getRoutes();  
      server.route(routes);

      if (typeof callbacks === 'object' && callbacks['onAfterRoutes']) {
        await callbacks['onAfterRoutes'](server)
      }
    } catch (e) {
      console.log(e);
      process.exit(1);
    }
  });
}



module.exports.start = function(callback) {
  let server = getServer();

  server.start(() => {
    server.log(['info'], `server running: ${server.info.uri}`);
    console.log('server running: ', server.info.uri);
    if (callback) {
      callback(server.info);
    }
  })
}
