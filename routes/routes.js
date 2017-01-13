const renderingInfoRoute = require('./rendering-info');
const scriptRoute = require('./tools/script');
const stylesheetRoute = require('./tools/stylesheet');
const versionRoute = require('./version');

module.exports = [
  renderingInfoRoute,
  scriptRoute,
  stylesheetRoute,
  versionRoute
]
