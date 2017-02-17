const querystring = require('querystring');
const fetch = require('node-fetch');
const Boom = require('boom');
const server = require('../server').getServer();
const deleteMetaProperties = require('../helper/meta-properties').deleteMetaProperties;

function isToolConfiguredForTarget(toolName, target, tools) {
  let endpointConfig = tools.get(`/${toolName}/endpoint`, { target: target })
  if (endpointConfig) {
    return true;
  }
  return false;
}

function getRenderingInfo(data, target, width, toolRuntimeConfig) {
  const toolName = data.tool;

  if (!isToolConfiguredForTarget(toolName, target, server.settings.app.tools)) {
    throw Boom.notImplemented(`no endpoint for tool ${toolName} and target ${target}`);
  }

  const baseUrl = server.settings.app.tools.get(`/${toolName}/baseUrl`, { target: target })
  const endpoint = server.settings.app.tools.get(`/${toolName}/endpoint`, { target: target })

  // if width is defined add it to path
  if (width) {
    endpoint.path += `/${width}`;
  }


  // add _id, createdDate and updatedDate as query params to rendering info request
  let queryParams = ['_id', 'createdDate', 'updatedDate'];
  let query = {};
  for (let queryParam of queryParams) {
    if (data.hasOwnProperty(queryParam) && data[queryParam]) {
      query[queryParam] = data[queryParam];
    }
  }
  let queryString = querystring.stringify(query);

  // strip the meta properties before sending the data to the tool service
  const body = {
    item: deleteMetaProperties(data),
    toolRuntimeConfig: toolRuntimeConfig
  }

  return fetch(`${baseUrl}${endpoint.path}?${queryString}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        return response.json()
          .then(data => {
            throw Boom.create(response.status, data.message);
          })
      } else {
        return response.json();
      }
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
        if (Array.isArray(renderingInfo.stylesheets)) {
          renderingInfo.stylesheets = renderingInfo.stylesheets.concat(endpoint.stylesheets);
        } else {
          renderingInfo.stylesheets = endpoint.stylesheets;
        }
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

      // add scripts configured in tool config
      if (endpoint.scripts && endpoint.scripts.length) {
        renderingInfo.scripts = renderingInfo.scripts.concat(endpoint.scripts)
      }

      return renderingInfo;
    })
}

module.exports = {
  getRenderingInfo: getRenderingInfo
}
