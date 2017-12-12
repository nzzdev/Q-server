// used in screenshot plugin
function resolvePath(resource, env) {
  if (!resource.url && resource.path) {
    resource.url = `http://localhost:3333${resource.path}`
  }
  delete resource.path;
  return resource;
}

module.exports = [
  {
    plugin: require('../plugins/core/base'),
    options: require('./config/base.js')
  },
  {
    plugin: require('../plugins/core/db'),
    options: {
      protocol: 'http',
      host: 'localhost:5984',
      database: 'q-items'
    }
  },
  {
    plugin: require('../plugins/core/editor'),
    options: {
      editorConfig: require('./config/editor.js').get('')
    }
  },
  {
    plugin: require('../plugins/core/rendering-info'),
    options: require('./config/rendering-info.js')
  },
  {
    plugin: require('../plugins/fixtures')
  },
  {
    plugin: require('../plugins/statistics')
  },
  {
    plugin: require('../plugins/screenshot'),
    options: {
      getScripts: function(renderingInfo) {
        const scripts = [];
        if (renderingInfo.loaderConfig && renderingInfo.loaderConfig.loadSystemJs === 'full') {
          scripts.push({url: `${process.env.Q_SERVER_BASE_URL}/files/system.js`});
        }
        if (renderingInfo.loaderConfig && renderingInfo.loaderConfig.polyfills) {
          scripts.push({url: `https://cdn.polyfill.io/v2/polyfill.min.js?features=${renderingInfo.loaderConfig.polyfills.join(',')}`});
        }
        if (renderingInfo.scripts && Array.isArray(renderingInfo.scripts)) {
          for (let script of renderingInfo.scripts) {
            script = resolvePath(script);
            if (script.url && script.url.includes('track-manager')) {
              continue;
            }
            scripts.push(script);
          }
        }
        return scripts;
      },
      getStylesheets: function(renderingInfo) {
        const stylesheets = [];
        if (renderingInfo.stylesheets && Array.isArray(renderingInfo.stylesheets)) {
          for (let stylesheet of renderingInfo.stylesheets) {
            stylesheet = resolvePath(stylesheet);
            stylesheets.push(stylesheet);
          }
        }
        return stylesheets;
      },
      cache: {
        cacheControl: {
          maxAge: 1,
          sMaxAge: 1,
          staleWhileRevalidate: 1,
          staleIfError: 1
        }
      }
    }
  },
  {
    plugin: require('../plugins/cdn/keycdn'),
    options: {
      zoneId: 'some-zone-id',
      apiKey: 'some-api-key',
      dryRun: true
    }
  }
];
