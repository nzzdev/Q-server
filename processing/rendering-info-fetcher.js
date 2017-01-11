const fetch = require('node-fetch');
const environment = require('../helper/environment');
const database = environment.database;
const repository = require('./repository');
const metaProperties = require('../helper/meta-properties');

const getMarkup = function(itemId, target) {
	let toolName;
	return repository.fetchQItem(itemId)
		.then(json => {
			toolName = json.tool;
			let tool = environment.targets[target].tools[toolName];
			for (var i = 0; i < metaProperties.length; i++) {
				delete json[metaProperties[i]];
			}
			let body = {};
			body.item = json;
			return fetch(tool.baseUrl + tool.endpoint, {
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
				if (json.stylesheets !== undefined && json.stylesheets.length > 0) {
					for (var i = 0; i < json.stylesheets.length; i++) {
						let stylesheet = json.stylesheets[i];
						if (stylesheet.name !== undefined) {
							stylesheet.name = toolName + '/' + stylesheet.name;
						}
					}
				}
				if (json.scripts !== undefined && json.scripts.length > 0) {
					for (var i = 0; i < json.scripts.length; i++) {
						let script = json.scripts[i];
						if (script.name !== undefined) {
							script.name = toolName + '/' + script.name;
						}
					}
				}
				return json;
			})
			.catch(err => {
				console.log(err);
			})
		})
	
}

module.exports = getMarkup;