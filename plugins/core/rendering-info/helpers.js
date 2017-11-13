const querystring = require('querystring');
const fetch = require('node-fetch');
const clone = require('clone');
const deepmerge = require('deepmerge');
const Boom = require('boom');
const deleteMetaProperties = require('../../../helper/meta-properties').deleteMetaProperties;

async function getRenderingInfo(item, baseUrl, endpointConfig, toolRuntimeConfig) {
  let requestUrl;
  if (endpointConfig.hasOwnProperty('path')) {
    requestUrl = `${baseUrl}${endpointConfig.path}`;
  } else if (endpointConfig.hasOwnProperty('url')) {
    requestUrl = endpointConfig.url;
  } else {
    throw new Error('Endpoint has no path nor url configured');
  }

  // add _id, createdDate and updatedDate as query params to rendering info request
  // todo: the tool could provide the needed query parameters in the config in a future version
  let queryParams = ['_id', 'createdDate', 'updatedDate'];
  let query = {};
  for (let queryParam of queryParams) {
    if (item.hasOwnProperty(queryParam) && item[queryParam]) {
      query[queryParam] = item[queryParam];
    }
  }
  let queryString = querystring.stringify(query);

  // strip the meta properties before sending the item to the tool service
  const body = {
    item: deleteMetaProperties(clone(item)),
    toolRuntimeConfig: toolRuntimeConfig
  }

  const response = await fetch(`${requestUrl}?${queryString}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    try {
      const data = await response.json();
      throw new Boom(data.message, { statusCode: response.status });
    } catch (err) {
      throw new Boom(err.message, { statusCode: response.status });
    }
  }

  let renderingInfo = await response.json();

  // check if the tool config has additional renderingInfo and apply it if so
  if (endpointConfig.additionalRenderingInfo) {
    renderingInfo = deepmerge(renderingInfo, endpointConfig.additionalRenderingInfo, {
      arrayMerge: (destArr, srcArr) => {
        return srcArr.concat(destArr);
      }
    });
  }

  // add the path to the stylesheets returned from rendering service if they have a name property
  if (renderingInfo.stylesheets !== undefined && renderingInfo.stylesheets.length > 0) {
    for (var i = 0; i < renderingInfo.stylesheets.length; i++) {
      let stylesheet = renderingInfo.stylesheets[i];
      if (stylesheet.name !== undefined) {
        stylesheet.path = `/tools/${item.tool}/stylesheet/${stylesheet.name}`;
      }
    }
  }

  // add the path to the scripts returned from rendering service if they have a name property
  if (renderingInfo.scripts !== undefined && renderingInfo.scripts.length > 0) {
    for (var i = 0; i < renderingInfo.scripts.length; i++) {
      let script = renderingInfo.scripts[i];
      if (script.name !== undefined) {
        script.path = `/tools/${item.tool}/script/${script.name}`;
      }
    }
  }
  return renderingInfo;
}

module.exports = {
  getRenderingInfo: getRenderingInfo
}
