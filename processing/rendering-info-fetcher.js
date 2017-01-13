const fetch = require('node-fetch');
const Boom = require('boom');
// const getServer = require('../server').getServer;
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
    .then(json => {
      toolName = json.tool.replace(new RegExp('-', 'g'), '_');
      
      if (!isToolConfiguredForTarget(toolName, target, server.settings.app.tools)) {
        throw Boom.notImplemented(`no endpoint for tool ${toolName} and target ${target}`);
      }

      const baseUrl = server.settings.app.tools.get(`/${toolName}/baseUrl`, { target: target })
      const endpoint = server.settings.app.tools.get(`/${toolName}/endpoint`, { target: target })

      let body = {};
      body.item = deleteMetaProperties(json);
      return fetch(baseUrl + endpoint.path, {
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
}

module.exports = {
  getRenderingInfo: getRenderingInfo
}
