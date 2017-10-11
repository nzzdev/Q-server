function getCacheControlDirectivesFromConfig(server) {
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
}

module.exports = {
  getCacheControlDirectivesFromConfig: getCacheControlDirectivesFromConfig
};