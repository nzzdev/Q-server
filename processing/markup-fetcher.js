const Fetch = require('node-fetch');
const environment = require('../helper/environment');
const repository = require('./repository');
const itemProperties = require('../helper/q-item-properties');

const getItem = function(itemId) {
	const database = environment.database;
	return repository.fetchQItem(itemId)
		.then(json => {
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
			.catch(err => {
				console.log(err);
			})
		})
	
}

module.exports = getItem;