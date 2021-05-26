const deepmerge = require("deepmerge");
const Mimos = require("@hapi/mimos");
const mimos = new Mimos.Mimos();

async function getWithResolvedFunction(
  renderingInfoPart,
  item,
  toolRuntimeConfig
) {
  const promises = renderingInfoPart.map(async (renderingInfoPartItem) => {
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
  return renderingInfoPart.map((renderingInfoPartItem) => {
    if (renderingInfoPartItem.name !== undefined) {
      renderingInfoPartItem.path = `/tools/${item.tool}/${typePath}/${renderingInfoPartItem.name}`;
    }
    return renderingInfoPartItem;
  });
}

function getRequestUrlFromEndpointConfig(toolEndpointConfig, baseUrl) {
  if (toolEndpointConfig.hasOwnProperty("path")) {
    return `${baseUrl}${toolEndpointConfig.path}`;
  } else if (toolEndpointConfig.hasOwnProperty("url")) {
    return toolEndpointConfig.url;
  }
  throw new Error("Endpoint has no path nor url configured");
}

function isValidContentTypeForTarget(targetConfig, contentType) {
  const mime = mimos.type(contentType);
  if (targetConfig.type === "web") {
    return mime.type === "application/json";
  }
  if (targetConfig.type === "image") {
    return mime.type.startsWith("image/");
  }
  return targetConfig.type === mime.type;
}

function canGetCompiled(targetConfig, contentType) {
  const mime = mimos.type(contentType);
  if (targetConfig.type === "web" && mime.type === "application/json") {
    return true;
  }
  return false;
}

async function getCompiledRenderingInfo({
  renderingInfo,
  endpointConfig,
  targetConfig,
  item,
  toolRuntimeConfig,
}) {
  // check if the tool config has additional renderingInfo and apply it if so
  if (endpointConfig.additionalRenderingInfo) {
    renderingInfo = deepmerge(
      renderingInfo,
      endpointConfig.additionalRenderingInfo,
      {
        arrayMerge: (destArr, srcArr) => {
          return srcArr.concat(destArr);
        },
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
        },
      }
    );
  }

  const renderingInfoTypesToResolve = [
    {
      name: "stylesheets",
      path: "stylesheet",
    },
    {
      name: "scripts",
      path: "script",
    },
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
  {
    serverWideToolRuntimeConfig,
    targetToolRuntimeConfig,
    toolEndpointConfig,
    requestToolRuntimeConfig,
  }
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
    overallToolRuntimeConfig.toolBaseUrl = `${protocol}://${overallToolRuntimeConfig.toolBaseUrl.host}${path}`;
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
    overallToolRuntimeConfig.fileRequestBaseUrl = `${protocol}://${overallToolRuntimeConfig.fileRequestBaseUrl.host}${path}`;
  }

  // default to the overall config
  let toolRuntimeConfig = overallToolRuntimeConfig;

  // add the item id if given
  if (item.hasOwnProperty("_id")) {
    toolRuntimeConfig.id = item._id;
  }

  // if the target defines tool runtime config, apply it
  if (targetToolRuntimeConfig) {
    toolRuntimeConfig = Object.assign(
      toolRuntimeConfig,
      targetToolRuntimeConfig
    );
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
  getCompiledToolRuntimeConfig,
  getRequestUrlFromEndpointConfig,
  isValidContentTypeForTarget,
  canGetCompiled,
  getCompiledRenderingInfo,
};
