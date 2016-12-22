const Fetch = require('node-fetch');

module.exports.fetchItemTool = function getItemTool(itemId) {
	let database = 'q-items-dev';
 	
 	return Fetch('https://nzz-storytelling.cloudant.com/' + database + '/' + itemId)
		.then(response => {
			return response.json();
		})
		.then(json => {
			return json.tool;
		})
}