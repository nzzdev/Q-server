module.exports = [
  require('./editor/tools'),

  require('./tools/script'),
  require('./tools/stylesheet'),
  require('./tools/schema.js'),

  require('./rendering-info').getRenderingInfoRoute,
  require('./rendering-info').postRenderingInfoRoute,

  require('./tools/default.js'),

  require('./version'),
]
.concat(
  require('./item.js')
)
