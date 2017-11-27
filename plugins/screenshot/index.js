const getRoutes = require('./routes.js').getRoutes;
const Hoek = require('hoek');

module.exports = {
  name: 'q-screenshot',
  register: async function(server, options) {

    Hoek.assert(typeof options.getStylesheets === 'function', 'options.getStylesheets must be a function');
    Hoek.assert(typeof options.getScripts === 'function', 'options.getScripts must be a function');

    server.method('plugins.q.screenshot.getStylesheets', options.getStylesheets);
    server.method('plugins.q.screenshot.getScripts', options.getScripts);

    const cacheControlDirectives = await server.methods.getCacheControlDirectivesFromConfig(options.cache.cacheControl);
    return server.route(getRoutes(cacheControlDirectives.join(',')));
  }
};
