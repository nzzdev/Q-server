const querystring = require('querystring');
const fetch = require('node-fetch');
const Boom = require('boom');
const server = require('../server').getServer();
const repository = require('./repository');
const deleteMetaProperties = require('../helper/meta-properties').deleteMetaProperties;

function isToolConfiguredForTarget(toolName, target, tools) {
  let endpointConfig = tools.get(`/${toolName}/endpoint`, { target: target })
  if (endpointConfig) {
    return true;
  }
  return false;
}

const getRenderingInfo = function(itemId, target) {
  let toolName;

  const itemDbBaseUrl = server.settings.app.misc.get('/itemDbBaseUrl');
  return repository.fetchQItem(itemId, itemDbBaseUrl)
    .then(item => {
      toolName = item.tool.replace(new RegExp('-', 'g'), '_');
      
      if (!isToolConfiguredForTarget(toolName, target, server.settings.app.tools)) {
        throw Boom.notImplemented(`no endpoint for tool ${toolName} and target ${target}`);
      }

      const baseUrl = server.settings.app.tools.get(`/${toolName}/baseUrl`, { target: target });
      const endpoint = server.settings.app.tools.get(`/${toolName}/endpoint`, { target: target });

      // add _id, createdDate and updatedDate as query params to rendering info request
      let queryParams = ['_id', 'createdDate', 'updatedDate'];
      let query = {};
      for (let queryParam of queryParams) {
        if (item.hasOwnProperty(queryParam) && item[queryParam]) {
          query[queryParam] = item[queryParam];
        }
      }
      let queryString = querystring.stringify(query);

      let body = {};
      body.item = deleteMetaProperties(item);
      return fetch(`${baseUrl}${endpoint.path}?${queryString}`, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json'
          }
        })
    })
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.json();
    })
    .then(json => {
      const endpoint = server.settings.app.tools.get(`/${toolName}/endpoint`, { target: target })

      // add the path to the stylesheets returned from rendering service
      if (json.stylesheets !== undefined && json.stylesheets.length > 0) {
        for (var i = 0; i < json.stylesheets.length; i++) {
          let stylesheet = json.stylesheets[i];
          if (stylesheet.name !== undefined) {
            stylesheet.path = `/tools/${toolName}/stylesheet/${stylesheet.name}`;
          }
        }
      }

      // add stylesheets configured in tool config
      if (endpoint.stylesheets && endpoint.stylesheets.length) {
        json.stylesheets = json.stylesheets.concat(endpoint.stylesheets)
      }

      // add the path to the scripts returned from rendering service
      if (json.scripts !== undefined && json.scripts.length > 0) {
        for (var i = 0; i < json.scripts.length; i++) {
          let script = json.scripts[i];
          if (script.name !== undefined) {
            script.path = `/tools/${toolName}/script/${stylesheet.name}`;
          }
        }
      }

      // add stylesheets configured in tool config
      if (endpoint.scripts && endpoint.scripts.length) {
        json.scripts = json.scripts.concat(endpoint.scripts)
      }

      return json;
    })
}

module.exports = {
  getRenderingInfo: getRenderingInfo
}
