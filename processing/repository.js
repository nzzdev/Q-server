const fetch = require('node-fetch');
const Boom = require('boom');

var fetchQItem = function(itemId, itemDbBaseUrl) {
  return fetch(`${itemDbBaseUrl}/${itemId}`)
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.json();
    })
}

module.exports.fetchQItem = fetchQItem;
