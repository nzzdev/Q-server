const confidence = require("confidence");

const tools = {
  tool1: {
    baseUrl: "http://localhost:9999",
    editor: {
      label_locales: {
        de: "tool1_de",
        en: "tool1_en"
      },
      icon:
        '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 31h32v1H0zM25 0h6v30h-6zm-8 6h6v24h-6zm-8 7h6v17H9zm-8 5h6v12H1z" fill-rule="evenodd"/></svg>'
    },
    endpoint: {
      $filter: "target",
      $default: false,
      pub1: {
        path: "/rendering-info/mock",
        additionalRenderingInfo: {
          stylesheets: [
            {
              url:
                "https://service.sophie.nzz.ch/bundle/sophie-font@^1,sophie-color@^1,sophie-viz-color@^1[general].css"
            },
            function(item, toolRuntimeConfig) {
              return {
                name: "functionGeneratedStylesheetName.css"
              };
            }
          ],
          scripts: [
            function(item, toolRuntimeConfig) {
              return {
                content: 'console.log("functionGeneratedScriptContent");'
              };
            }
          ]
        }
      },
      pub2: {
        path: "/rendering-info/mock",
        additionalRenderingInfo: {
          stylesheets: [
            {
              url:
                "https://service.sophie.nzz.ch/bundle/sophie-nzzas-q@^1,sophie-nzzas-font@^1,sophie-nzzas-color@^1,sophie-nzzas-viz-color@^1[general].css"
            }
          ]
        }
      },
      fail: {
        path: "/rendering-info/fail",
        additionalRenderingInfo: {
          stylesheets: [
            {
              url:
                "https://service.sophie.nzz.ch/bundle/sophie-nzzas-q@^1,sophie-nzzas-font@^1,sophie-nzzas-color@^1,sophie-nzzas-viz-color@^1[general].css"
            }
          ]
        }
      }
    }
  },
  tool2: {
    baseUrl: "http://localhost:9998",
    editor: {
      icon:
        '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 31h32v1H0zM25 0h6v30h-6zm-8 6h6v24h-6zm-8 7h6v17H9zm-8 5h6v12H1z" fill-rule="evenodd"/></svg>'
    },
    endpoint: {
      $filter: "target",
      $default: false,
      pub1: {
        path: "/rendering-info/mock"
      }
    }
  }
};

const env = process.env.APP_ENV || "local";
const store = new confidence.Store(tools);

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria);
  return store.get(key, criteria);
};

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria);
  return store.meta(key, criteria);
};
