module.exports = {
	targets: {
		'nzz-ch': {
			tools: {
				'party-slogans': {
					baseUrl: 'http://q-party-slogans:3000',
					endpoint: '/rendering-info/html-static',
					stylesheets: [
						{
							url: 'https://service.sophie.nzz.ch/bundle/sophie-q@~0.1.1,sophie-font@^0.1.0,sophie-color@~1.0.0,sophie-viz-color@^1.0.0[diverging-6].css',
							type: 'critical'
						}
					]
				}
			}
		}
	},
	database: 'q-items-dev'
}
