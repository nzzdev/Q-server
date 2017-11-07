module.exports = {
  name: 'q-base',
  dependencies: ['q-db'],
  register: async function(server, options) {

    server.register([
      require('vision'),
      require('inert')
    ]);

    server.method('getCacheControlDirectivesFromConfig', async function() {
      const cacheControlDirectives = [
        'public'
      ];
    
      if (server.settings.app.misc.get('/cache/cacheControl/maxAge')) {
        cacheControlDirectives.push(`max-age=${server.settings.app.misc.get('/cache/cacheControl/maxAge')}`);
      }
      if (server.settings.app.misc.get('/cache/cacheControl/sMaxAge')) {
        cacheControlDirectives.push(`s-maxage=${server.settings.app.misc.get('/cache/cacheControl/sMaxAge')}`);
      }
      if (server.settings.app.misc.get('/cache/cacheControl/staleWhileRevalidate')) {
        cacheControlDirectives.push(`stale-while-revalidate=${server.settings.app.misc.get('/cache/cacheControl/staleWhileRevalidate')}`);
      }
      if (server.settings.app.misc.get('/cache/cacheControl/staleIfError')) {
        cacheControlDirectives.push(`stale-if-error=${server.settings.app.misc.get('/cache/cacheControl/staleIfError')}`);
      }
    
      return cacheControlDirectives;
    });

    server.route([
      require('./routes/item.js').get,
      require('./routes/item.js').post,
      require('./routes/item.js').put,
      require('./routes/search.js'),
      require('./routes/tool-default.js').get,
      require('./routes/tool-default.js').post,
      require('./routes/tool-schema.js').schema,
      require('./routes/tool-schema.js').displayOptionsSchema
    ])
  }
}