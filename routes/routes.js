const renderingInfoRoute = require('./rendering-info');
const scriptsRoute = require('./tools/scripts');
const stylesRoute = require('./tools/styles');
const versionRoute = require('./version');

module.exports = [
  renderingInfoRoute,
  scriptsRoute,
  stylesRoute,
  versionRoute
]
