module.exports = [
  require('./tools/script'),
  require('./tools/stylesheet'),
  require('./tools/schema'),
  require('./tools/default'),

  require('./editor/targets'),
  require('./editor/tools'),
  require('./editor/config'),

  require('./rendering-info').getRenderingInfoRoute,
  require('./rendering-info').postRenderingInfoRoute,

  require('./search'),
  require('./statistics/number-of-items'),

  require('./version'),
]
.concat(
  require('./item.js')
)
