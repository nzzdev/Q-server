const fetch = require('node-fetch');
const environment = require('../helper/environment');
const database = environment.database;
const repository = require('./repository');
const itemProperties = require('../helper/q-item-properties');

const getItem = function(itemId, target) {
	return repository.fetchQItem(itemId)
		.then(json => {
			let toolName = json.tool;
			let toolProperty = environment.targets[target].tools[toolName];
			for (var i = 0; i < itemProperties.length; i++) {
				delete json[itemProperties[i]];
			}
			let body = {};
			body.item = json;
			return fetch(toolProperty.baseUrl + toolProperty.endpoint, {
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