module.exports = [
  require('./version'),
  require('./rendering-info').getRenderingInfoRoute,
  require('./rendering-info').postRenderingInfoRoute,
  require('./tools/script'),
  require('./tools/stylesheet'),
  require('./tools/schema'),
  require('./tools/default'),
  require('./editor/targets'),
  require('./editor/tools')
]
