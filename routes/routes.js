module.exports = [
  require('./version'),
  require('./rendering-info').getRenderingInfoRoute,
  require('./rendering-info').postRenderingInfoRoute,
  require('./tools/script'),
  require('./tools/stylesheet'),
  require('./tools/schema.js'),
  require('./editor/tools')
]
