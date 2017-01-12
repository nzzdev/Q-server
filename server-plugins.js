module.exports = [
	require('inert'),
	require('vision'),
	{
		register: require('hapi-swagger'),
		options: {
			info: {
				'title': 'Q server API Documentation',
				'version': require('./package').version,
			}
		}
	},
	{
		register: require('hapi-etags'),
		options: {
			etagOptions: {
				weak: true
			}
		}
	}
]