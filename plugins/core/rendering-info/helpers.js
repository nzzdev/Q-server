const querystring = require("querystring");
const fetch = require("node-fetch");
const clone = require("clone");
const deepmerge = require("deepmerge");
const Boom = require("boom");
const deleteMetaProperties = require("../../../helper/meta-properties")
  .deleteMetaProperties;

async function getWithResolvedFunction(
  renderingInfoPart,
  item,
  toolRuntimeConfig
) {
  const promises = renderingInfoPart.map(async renderingInfoPartItem => {
    if (renderingInfoPartItem instanceof Function) {
      return await renderingInfoPartItem.apply(this, [item, toolRuntimeConfig]);
    }
    return renderingInfoPartItem;
  });

  return Promise.all(promises);
}

function getWithResolvedNameProperty(
  typePath,
  renderingInfoPart,
  item,
  toolRuntimeConfig
) {
  return renderingInfoPart.map(renderingInfoPartItem => {
    if (renderingInfoPartItem.name !== undefined) {
      renderingInfoPartItem.path = `/tools/${item.tool}/${typePath}/${
        renderingInfoPartItem.name
      }`;
    }
    return renderingInfoPartItem;
  });
}

async function getRenderingInfo(
  item,
  baseUrl,
  endpointConfig,
  toolRuntimeConfig,
  targetConfig,
  itemStateInDb
) {
  let requestUrl;
  if (endpointConfig.hasOwnProperty("path")) {
    requestUrl = `${baseUrl}${endpointConfig.path}`;
  } else if (endpointConfig.hasOwnProperty("url")) {
    requestUrl = endpointConfig.url;
  } else {
    throw new Error("Endpoint has no path nor url configured");
  }

  // add _id, createdDate and updatedDate as query params to rendering info request
  // todo: the tool could provide the needed query parameters in the config in a future version
  let queryParams = ["_id", "createdDate", "updatedDate"];
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
    itemStateInDb: itemStateInDb,
    toolRuntimeConfig: toolRuntimeConfig
  };

  const response = await fetch(`${requestUrl}?${queryString}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
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
    renderingInfo = deepmerge(
      renderingInfo,
      endpointConfig.additionalRenderingInfo,
      {
        arrayMerge: (destArr, srcArr) => {
          return srcArr.concat(destArr);
        }
      }
    );
  }

  if (targetConfig.additionalRenderingInfo) {
    renderingInfo = deepmerge(
      renderingInfo,
      targetConfig.additionalRenderingInfo,
      {
        arrayMerge: (destArr, srcArr) => {
          return srcArr.concat(destArr);
        }
      }
    );
  }

  const renderingInfoTypesToResolve = [
    {
      name: "stylesheets",
      path: "stylesheet"
    },
    {
      name: "scripts",
      path: "script"
    }
  ];
  for (const type of renderingInfoTypesToResolve) {
    if (
      renderingInfo[type.name] !== undefined &&
      renderingInfo[type.name].length > 0
    ) {
      renderingInfo[type.name] = await getWithResolvedFunction(
        renderingInfo[type.name],
        item,
        toolRuntimeConfig
      );

      renderingInfo[type.name] = getWithResolvedNameProperty(
        type.path,
        renderingInfo[type.name],
        item,
        toolRuntimeConfig
      );
    }
  }
  return renderingInfo;
}

function getCompiledToolRuntimeConfig(
  item,
  { serverWideToolRuntimeConfig, toolEndpointConfig, requestToolRuntimeConfig }
) {
  const overallToolRuntimeConfig = serverWideToolRuntimeConfig;

  // simplify the toolBaseUrl to an url string if it is an object by applying some defaults before sending it to the tool
  if (
    typeof overallToolRuntimeConfig.toolBaseUrl === "object" &&
    overallToolRuntimeConfig.toolBaseUrl.host
  ) {
    // the default protocol is https
    let protocol = "https";
    if (overallToolRuntimeConfig.toolBaseUrl.protocol) {
      protocol = overallToolRuntimeConfig.toolBaseUrl.protocol;
    }
    // the default if no path is given is to add /tools/{toolname}
    let path = `/tools/${item.tool}`;
    if (overallToolRuntimeConfig.toolBaseUrl.path) {
      path = overallToolRuntimeConfig.toolBaseUrl.path;
    }
    overallToolRuntimeConfig.toolBaseUrl = `${protocol}://${
      overallToolRuntimeConfig.toolBaseUrl.host
    }${path}`;
  }

  // simplify the fileRequestBaseUrl to an url string if it is an object by applying some defaults before sending it to the tool
  if (
    typeof overallToolRuntimeConfig.fileRequestBaseUrl === "object" &&
    overallToolRuntimeConfig.fileRequestBaseUrl.host
  ) {
    // the default protocol is https
    let protocol = "https";
    if (overallToolRuntimeConfig.fileRequestBaseUrl.protocol) {
      protocol = overallToolRuntimeConfig.fileRequestBaseUrl.protocol;
    }
    // the default if no path is given is /file
    let path = "/file";
    if (overallToolRuntimeConfig.fileRequestBaseUrl.path) {
      path = overallToolRuntimeConfig.fileRequestBaseUrl.path;
    }
    overallToolRuntimeConfig.fileRequestBaseUrl = `${protocol}://${
      overallToolRuntimeConfig.fileRequestBaseUrl.host
    }${path}`;
  }

  // default to the overall config
  let toolRuntimeConfig = overallToolRuntimeConfig;

  // add the item id if given
  if (item.hasOwnProperty("_id")) {
    toolRuntimeConfig.id = item._id;
  }

  // if endpoint defines tool runtime config, apply it
  if (toolEndpointConfig && toolEndpointConfig.toolRuntimeConfig) {
    toolRuntimeConfig = Object.assign(
      toolRuntimeConfig,
      toolEndpointConfig.toolRuntimeConfig
    );
  }

  // apply to runtime config from the request
  toolRuntimeConfig = Object.assign(
    toolRuntimeConfig,
    requestToolRuntimeConfig
  );

  return toolRuntimeConfig;
}

module.exports = {
  getRenderingInfo: getRenderingInfo,
  getCompiledToolRuntimeConfig: getCompiledToolRuntimeConfig
};
