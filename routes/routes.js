function getRoutes() {
  const server = require('../server').getServer();

  let routes = [
    require('./tools/default').get,
    require('./tools/default').post,

    require('./editor/targets'),
    require('./editor/tools'),
    require('./editor/config'),
    require('./editor/locales'),

    require('./rendering-info').getRenderingInfoRoute,
    require('./rendering-info').postRenderingInfoRoute,

    require('./search'),
    require('./statistics/number-of-items'),

    require('./admin/migration'),

    require('./version'),
    require('./health'),
  ]
  .concat(
    require('./item.js'),
    require('./tools/schema')
  )

  if (server.methods.screenshot && typeof server.methods.screenshot.getScripts === 'function' && typeof server.methods.screenshot.getStylesheets === 'function') {
    routes = routes.concat(require('./screenshot.js'));
  }

  return routes;
}

module.exports = {
  getRoutes: getRoutes 
};
