module.exports = [
  require('./tools/script'),
  require('./tools/stylesheet'),
  require('./tools/schema'),
  require('./tools/default'),

  require('./editor/targets'),
  require('./editor/tools'),

  require('./rendering-info').getRenderingInfoRoute,
  require('./rendering-info').postRenderingInfoRoute,

  require('./version'),
]
.concat(
  require('./item.js')
)
