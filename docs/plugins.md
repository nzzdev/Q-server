---
title: Plugins
---

## screenshot
To use the screenshot plugin you have to configure it.
You do this by passing these settings in the `hapi` object in the config object passed to Q server init function:
```javascript
init({
  hapi: {
    plugins: {
      'q-screenshot': {
        methods: {
          getScripts: function(renderingInfo) {
            const scripts = [];
            // implement your specific loader logic here, turning whatever your tools return as renderingInfo
            // into an array of scripts. every object in this array needs to have one of two properties: content, url
            return scripts;
          },
          getStylesheets: function(renderingInfo) {
            const stylesheets = [];
            // implement your specific loader logic here, turning whatever your tools return as renderingInfo
            // into an array of stylesheets. every object in this array needs to have one of two properties: content, url
            return stylesheets;
          }
        }
      }
    }
  },
  config: {
  // ...
  }
}
```
You need to have a _config/targets.js_ in your Q server implementation that configures the targets to be used with the screenshot api as `type: 'web'`.

This gives you an endpoint `/screenshot/{id}.png?target=your_target&width=600&dpr=2&background=white&padding=20` where `dpr` (default: `1`), `background` (default: background could be set by any context css loaded for the target. set to none to get transparent in any case) and `padding` (default: `0`) are optional.