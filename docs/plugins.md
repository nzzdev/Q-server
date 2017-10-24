---
title: Plugins
---

## screenshot
To use the screenshot plugin you have to configure two server methods in your Q server implementation.
- `plugins.screenshot.getScripts` takes one argument `renderingInfo` with the renderingInfo returned from the Q server `/rendering-info` endpoint.
- `plugins.screenshot.getStylesheets` takes one argument `renderingInfo` with the renderingInfo returned from the Q server `/rendering-info` endpoint.

You should implement your own loader logic in these methods and return an array of objects containing either `url` or `content` as a property.

You need to have a _config/targets.js_ in your Q server implementation that configures the targets to be used with the screenshot api as `type: 'web'`.

This gives you an endpoint `/screenshot/{id}.png?target=your_target&width=600&dpr=2&background=white&padding=20` where `dpr` (default: `1`), `background` (default: no background) and `padding` (default: `0`) are optional.