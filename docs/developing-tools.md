---
title: Developing Tools
---

## API Endpoints
A __Q tool__ is a HTTP service providing an API to get rendering information for a given dataset. One endpoint to return the tool specific JSON schema is mandatory as it's used by Q editor for rendering and validation of the respective form:

- __GET__ _/schema.json_

Additionally you can specify an endpoint to get rendering information for a given Q item. See [Rendering Info?](rendering-info.html) for detailed information about what we mean with that term. The exact endpoint path is variable and specified in _config/tools.js_ of your Q server implementation for each tool and target individually. The path may be meaningful in the sense of what will be returned. So far, we make use of the following two endpoints:

- __POST__ _/rendering-info/html-static_: returns static rendering information, like markup and optional stylesheets
- __POST__ _/rendering-info/html-js_: returns rendering information that contains client side scripts among markup and optional styleheets

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
              name: 'default'
            }
          ], 
          // pass the data object to svelte render function to get markup
          markup: staticTemplate.render(request.payload.item)
        }
        return reply(data);
      }
    }
   ```

As explained in _on name and path_ on [Rendering Info?](rendering-info.html) we'll need additional endpoints if a tool requires stylesheets or scripts to load:
- __GET__ _/stylesheet/{name*}_: returns the stylesheet according to the given name. In our examples we use Sass for styling and return rendered css. Typically the handler method is the same for each stylesheet name, hence we just need one endpoint with the name as path parameter, like specified in our [Q renderer skeleton](https://github.com/nzzdev/Q-renderer-skeleton/blob/master/routes/stylesheet.js):

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
              postcss([ autoprefixerPlugin ]).process(result.css)
              .then(result => {
                if (result.warnings().length > 0) {
                  return reply(result).type('text/css');
                }
                return reply(result.css).type('text/css');
              });
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

We use [Svelte](https://svelte.technology/) to get the tool specific markup. All markup related files can be found in the _views_ folder of each tool. Typically we have a base markup file like _views/html-static.html_ and some components for rendering e.g. header or footer. A basic example can be found in our [Q renderer skeleton](https://github.com/nzzdev/Q-renderer-skeleton/tree/master/views). The renderer method of svelte is called in the handler method of the rendering-info endpoint and gets the Q item as parameter:
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
            name: 'default'
          }
        ],
        markup: staticTemplate.render(request.payload.item)
      }
      return reply(data);
    }
  }
```

## Docker

We deploy each tool as a Docker container in our environment. See [Docker documentation](https://docs.docker.com/) to get familiar with Docker. Our Dockerfiles do have a simple structure which is the same for each tool:

```sh
# Use following version of Node as the base image
FROM node:7.6

# Set work directory for run/cmd
WORKDIR /app

# Copy package.json into work directory and install dependencies
COPY package.json /app/package.json
RUN npm install

# Copy everthing else in work directory
COPY . /app

# Expose server port
EXPOSE 3000

# Run node
CMD ["node", "/app/index.js"]
```

All docker containers including Q editor and Q server implementation are hosted on our Rancher platform. See [Rancher Website](https://rancher.com/) or [Rancher documentation](https://docs.rancher.com) for more information. You can setup your whole environment differently and without Docker of course. 

## Travis

[Travis](https://travis-ci.com/) is our continious integration service of choice. If you want to learn how to set it up, consult the [Travis documentation](https://docs.travis-ci.com/). The build includes execution of tests, creation and push of the docker container to docker hub as well as, if the current branch is staging, the automatic upgrade of the docker container in Rancher. 

```yml
dist: trusty
sudo: true
services:
- docker
language: node_js
node_js:
- '7.6'
install:
- npm install
before_script:
- DOCKER_IMAGE_NAME="q-renderer-skeleton"
- DOCKER_TAG=$TRAVIS_BRANCH
script:
- npm test
- docker build -t $DOCKER_IMAGE_NAME:$DOCKER_TAG .
- docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"; docker tag $DOCKER_IMAGE_NAME:$DOCKER_TAG
  nzzonline/$DOCKER_IMAGE_NAME:$DOCKER_TAG; docker push nzzonline/$DOCKER_IMAGE_NAME:$DOCKER_TAG;
- if [ "$TRAVIS_BRANCH" == "staging" ] && [ $TRAVIS_PULL_REQUEST == "false" ]; then docker run --rm -it -e RANCHER_URL -e CATTLE_ACCESS_KEY 
  -e CATTLE_SECRET_KEY etlweather/gaucho upgrade $RANCHER_SERVICE_ID_STAGING --auto_complete 
  --start_first --imageUuid="docker:nzzonline/$DOCKER_IMAGE_NAME:$DOCKER_TAG" || true; 
  fi
cache:
  directories:
  - node_modules
```
