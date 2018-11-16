exports.getCacheControlDirectivesFromConfig = async function (cacheControlConfig) {
  // return early if no config given, default is 'no-cache'
  if (!cacheControlConfig) {
    return ["no-cache"];
  }

  const cacheControlDirectives = [];

  if (cacheControlConfig.public) {
    cacheControlDirectives.push("public");
  }
  if (cacheControlConfig.maxAge) {
    cacheControlDirectives.push(`max-age=${cacheControlConfig.maxAge}`);
  }
  if (cacheControlConfig.sMaxAge) {
    cacheControlDirectives.push(`s-maxage=${cacheControlConfig.sMaxAge}`);
  }
  if (cacheControlConfig.staleWhileRevalidate) {
    cacheControlDirectives.push(
      `stale-while-revalidate=${cacheControlConfig.staleWhileRevalidate}`
    );
  }
  if (cacheControlConfig.staleIfError) {
    cacheControlDirectives.push(
      `stale-if-error=${cacheControlConfig.staleIfError}`
    );
  }

  return cacheControlDirectives;
}
