const Hoek = require('hoek');

const routes = [
  require('./routes/targets'),
  require('./routes/tools'),
  require('./routes/locales')
]

const defaults = {
  editorConfig: {

  }
}

module.exports = {
  name: 'q-editor-api',
  register: async function (server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);
    server.route(routes);

    server.route({
      path: '/editor/config',
      method: 'GET',
      config: {
        description: 'Returns configuration for Q Editor',
        tags: ['api', 'editor']
      },
      handler: (request, h) => {
        return settings.editorConfig;
      }
    })
  }
};
