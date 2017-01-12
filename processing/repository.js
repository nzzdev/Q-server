const fetch = require('node-fetch');
const Boom = require('boom');
const environment = require('../helper/environment');
const database = environment.database;

var fetchQItem = function(itemId) {
  return fetch('https://nzz-storytelling.cloudant.com/' + database + '/' + itemId)
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.json();
    })
}

module.exports.fetchQItem = fetchQItem;

