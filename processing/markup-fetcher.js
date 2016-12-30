const Fetch = require('node-fetch');
//TODO: at the moment environment is fixed, has to be variable too
const staging = require('../config/environments/staging');

const baseUrl = staging.baseUrl;

const getItem = function(itemId) {
	const database = staging.database;
 	console.log('https://nzz-storytelling.cloudant.com/' + database + '/' + itemId);
 	return Fetch('https://nzz-storytelling.cloudant.com/' + database + '/' + itemId)
		.then(response => {
			return response.json();
		}).then(json => {
			let tool = json.tool;
			// TODO: let tool decide from which base url data should be fetched -> via config file
			let body = {};
			body.item = json;
			console.log(JSON.stringify(body));
			return Fetch('https://q-' + tool + '.' + baseUrl + '/static', {
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