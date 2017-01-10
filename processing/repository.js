const fetch = require('node-fetch');
const environment = require('../helper/environment');
const database = environment.database;

var fetchQItem = function(itemId) {
    return fetch('https://nzz-storytelling.cloudant.com/' + database + '/' + itemId)
        .then(response => {
            return response.json();
        })
        .catch(err => {
            console.log(err);
        })
}

module.exports.fetchQItem = fetchQItem;

