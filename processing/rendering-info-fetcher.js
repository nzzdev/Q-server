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

function getRenderingInfo(data, target) {
  const toolName = data.tool.replace(new RegExp('-', 'g'), '_');
  const baseUrl = server.settings.app.tools.get(`/${toolName}/baseUrl`, { target: target })
  const endpoint = server.settings.app.tools.get(`/${toolName}/endpoint`, { target: target })

  const body = {
    item: deleteMetaProperties(data)
  }

  return fetch(baseUrl + endpoint.path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw Boom.create(response.status, response.statusText);
      }
      return response.json();
    })
    .then(renderingInfo => {
      // add the path to the stylesheets returned from rendering service
      if (renderingInfo.stylesheets !== undefined && renderingInfo.stylesheets.length > 0) {
        for (var i = 0; i < renderingInfo.stylesheets.length; i++) {
          let stylesheet = renderingInfo.stylesheets[i];
          if (stylesheet.name !== undefined) {
            stylesheet.path = `/tools/${toolName}/stylesheet/${stylesheet.name}`;
          }
        }
      }

      // add stylesheets configured in tool config
      if (endpoint.stylesheets && endpoint.stylesheets.length) {
        renderingInfo.stylesheets = renderingInfo.stylesheets.concat(endpoint.stylesheets)
      }

      // add the path to the scripts returned from rendering service
      if (renderingInfo.scripts !== undefined && renderingInfo.scripts.length > 0) {
        for (var i = 0; i < renderingInfo.scripts.length; i++) {
          let script = renderingInfo.scripts[i];
          if (script.name !== undefined) {
            script.path = `/tools/${toolName}/script/${script.name}`;
          }
        }
      }

      // add stylesheets configured in tool config
      if (endpoint.scripts && endpoint.scripts.length) {
        renderingInfo.scripts = renderingInfo.scripts.concat(endpoint.scripts)
      }

      return renderingInfo;
    })
}

const getRenderingInfoForId = function(itemId, target) {
  const itemDbBaseUrl = server.settings.app.misc.get('/itemDbBaseUrl');

  return repository.fetchQItem(itemId, itemDbBaseUrl)
    .then(data => {
      const toolName = data.tool.replace(new RegExp('-', 'g'), '_');

      if (!isToolConfiguredForTarget(toolName, target, server.settings.app.tools)) {
        throw Boom.notImplemented(`no endpoint for tool ${toolName} and target ${target}`);
      }

      return getRenderingInfo(data, target);
    })
}

const getRenderingInfoForData = function(data, target) {
  const toolName = data.tool.replace(new RegExp('-', 'g'), '_');

  if (!isToolConfiguredForTarget(toolName, target, server.settings.app.tools)) {
    throw Boom.notImplemented(`no endpoint for tool ${toolName} and target ${target}`);
  }

  return getRenderingInfo(data, target);
}

module.exports = {
  getRenderingInfoForId: getRenderingInfoForId,
  getRenderingInfoForData: getRenderingInfoForData
}
