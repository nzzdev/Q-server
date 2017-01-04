const Fetch = require('node-fetch');

var environment;
if (process.env.APP_ENV === "dev") {
	environment = require('../config/environments/dev');
} else {
	environment = require('../config/environments/local');
}

const itemProperties = require('../helper/q-item-properties');

const getItem = function(itemId) {
	const database = environment.database;
 	return Fetch('https://nzz-storytelling.cloudant.com/' + database + '/' + itemId)
		.then(response => {
			return response.json();
		}).then(json => {
			let tool = json.tool;
			for (var i = 0; i < itemProperties.length; i++) {
				delete json[itemProperties[i]];
			}
			let body = {};
			body.item = json;
			return Fetch(environment.toolUrls[tool] + '/static', {
				method: 'POST',
				body: JSON.stringify(body),
				headers: { 
					'Content-Type': 'application/json' 
				}
			})
			.then(response => {
				return response.json();
			})
			.then(json => {
				return json;
			})
			.catch(err => {
				console.log(err);
			})
		})
}

module.exports = getItem;