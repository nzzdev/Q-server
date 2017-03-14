---
title: Developing Tools
---

## API Endpoints
A __Q tool__ is a HTTP service providing an API to get rendering information for a given dataset. Two endpoints have to be specified:

- __POST__ _/rendering-info/..._: The dotted part is variable and dependent on the specific target-tool combination. The following endpoints are feasable:
  - _/rendering-info/html-static_: returns markup and optional stylesheets
  - _/rendering-info/html-js_: returns markup, optional styleheets and scripts which have to be loaded on client side
  - _/rendering-info/image_: returns an image, use for those targets which cannot render markup
  
   Of course you can also define other endpoints which better fit your needs. The exact endpoint is configured in _config/tools.js_ of your Q server config (i.e. Q server demo in our example) for each tool and target individually.

   Example for a basic html-static route:
   ```javascript
    module.exports = {
      method: 'POST',
      path: '/rendering-info/html-static',
      config: {
        validate: {
          options: {
            allowUnknown: true
          },
          payload: {
            // item gets validated against given schema
            item: schema,
            // one can pass further runtime configuration
            toolRuntimeConfig: Joi.object()
          }
        },
        cors: true
      },
      handler: function(request, reply) {
        let data = {
          stylesheets: [
            {
              // name of stylesheet will be used to call the correct stylesheet endpoint to load css
              // one can also specify a url instead which will result in loading css directly from that url
              name: 'default',
              type: 'critical'
            }
          ], 
          // pass the data object to svelte render function to get markup
          markup: staticTemplate.render(request.payload.item)
        }
        return reply(data);
      }
    }
   ```
- __GET__ _/schema.json_: Get the tool specific schema. Used by Q editor for rendering and validation of the respective form.

If a tool requires stylesheets or scripts to load, you'll need additional endpoints:
- __GET__ _/stylesheet/{name*}_: returns the stylesheet according to the given name. In our examples we use Sass for styling and return rendered css. Typically the handler method is the same for each stylesheet name, hence we just need one endpoint with the name as path parameter, like specified in our [Q renderer skeleton](https://github.com/nzzdev/Q-renderer-skeleton/blob/master/routes/stylesheet.js):
<!-- what to do with postcss?? Leave it in skeleton, add it here? -->
```javascript
  module.exports = {
    method: 'GET',
    path: '/stylesheet/{name*}',
    handler: function(request, reply) {
      const filePath = stylesDir + `${request.params.name}.scss`;
      fs.exists(filePath, (exists) => {
        if (!exists) {
          return reply(Boom.notFound())
        }
        sass.render(
          {
            file: filePath,
            outputStyle: 'compressed'
          }, 
          (err, result) => {
            if (err) {
              reply(Boom.badImplementation(err));
            } else {
              reply(result.css)
            }
          }
        )
      });
    }
  }
```
- __GET__ _/script/{name*}_: returns the script according to the given name. Typically the handler method differs depending on the specific script, hence we need an endpoint for each specific name, like:
```javascript
  module.exports = {
    method: 'GET',
    path: '/script/system.js',
    handler: function(request, reply) {
      reply.file(__dirname + '/../node_modules/systemjs/dist/system-production.src.js');
    }
  }
```

## Rendering

We use [Svelte](https://svelte.technology/) to get the tool specific markup. All markup related files can be found in the _views_ folder of each tool. Typically we have a base markup file like _views/html-static.html_ and some components for rendering e.g. the header or the footer. A basic example can be found in our [Q renderer skeleton](https://github.com/nzzdev/Q-renderer-skeleton/tree/master/views). The renderer method of svelte is called in the handler method of the rendering-info endpoint and gets the Q item as parameter:
```javascript
  //...
  require('svelte/ssr/register');
  const staticTemplate = require(viewsDir + 'html-static.html');
  //...
  module.exports = {
    //...
    handler: function(request, reply) { 
      let data = {
        stylesheets: [
          {
            name: 'default',
            type: 'critical'
          }
        ],
        markup: staticTemplate.render(request.payload.item)
      }
      return reply(data);
    }
  }
```

## Docker

## Travis
