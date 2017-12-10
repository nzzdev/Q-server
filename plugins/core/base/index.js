module.exports = {
  name: 'q-base',
  dependencies: ['q-db'],
  register: async function(server, options) {

    await server.register([
      require('vision'),
      require('inert')
    ]);

    server.method('getCacheControlDirectivesFromConfig', async function(cacheControlConfig) {
      const cacheControlDirectives = [
        'public'
      ];
    
      // return early if no config given
      if (!cacheControlConfig) {
        return cacheControlDirectives;
      }

      if (cacheControlConfig.maxAge) {
        cacheControlDirectives.push(`max-age=${cacheControlConfig.maxAge}`);
      }
      if (cacheControlConfig.sMaxAge) {
        cacheControlDirectives.push(`s-maxage=${cacheControlConfig.sMaxAge}`);
      }
      if (cacheControlConfig.staleWhileRevalidate) {
        cacheControlDirectives.push(`stale-while-revalidate=${cacheControlConfig.staleWhileRevalidate}`);
      }
      if (cacheControlConfig.staleIfError) {
        cacheControlDirectives.push(`stale-if-error=${cacheControlConfig.staleIfError}`);
      }
    
      return cacheControlDirectives;
    });

    server.event('item.new');
    server.event('item.update');

    await server.route([
      require('./routes/item.js').get,
      require('./routes/item.js').post,
      require('./routes/item.js').put,
      require('./routes/search.js'),
      require('./routes/tool-default.js').getGetRoute(options),
      require('./routes/tool-default.js').getPostRoute(options),
      require('./routes/tool-schema.js').schema,
      require('./routes/tool-schema.js').displayOptionsSchema,
      require('./routes/health.js'),
      require('./routes/version.js'),
      require('./routes/admin/migration.js')
    ]);

  }
}
