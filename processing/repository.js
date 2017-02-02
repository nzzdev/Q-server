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
    .then(data => {
      // transform legacy tool name with dashes to underscore
      // we need to do this as the configuration framework 'confidence' we use
      // has some problems with key names containing dashes
      data.tool = data.tool.replace(new RegExp('-', 'g'), '_');
      return data;
    })
}

module.exports.fetchQItem = fetchQItem;
