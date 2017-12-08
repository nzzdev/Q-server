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
      options: {
        validate: {
          options: {
            allowUnknown: true
          },
          payload: {
            // item gets validated against given schema
            item: schema,
            // true if item was read from database, false if not (useful if you want to use the appendItemToPayload query from Q servers tool-default route)
            itemStateInDb: Joi.boolean(),
            // one can pass further runtime configuration
            toolRuntimeConfig: Joi.object()
          }
        },
        cors: true
      },
      handler: async function(request, h) {
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
        return data;
      }
    }
   ```

As explained in _on name and path_ on [Rendering Info?](rendering-info.html) we'll need additional endpoints if a tool requires stylesheets or scripts to load:
- __GET__ _/stylesheet/{name*}_: returns the stylesheet according to the given name. In our examples we use Sass for styling and return rendered css. Typically the handler method is the same for each stylesheet name, hence we just need one endpoint with the name as path parameter, like specified in our [Q renderer skeleton](https://github.com/nzzdev/Q-renderer-skeleton/blob/master/routes/stylesheet.js):

```javascript
  module.exports = {
    method: 'GET',
    path: '/stylesheet/{name*}.css',
    handler: async function(request, h) {
      // return the stylesheet content
    }
  }
```
- __GET__ _/script/{name*}_: returns the script according to the given name.
```javascript
  module.exports = {
    method: 'GET',
    path: '/script/{name*}.js',
    handler: function(request, reply) {
      // return the script content
    }
  }
```

## Docker

We deploy each tool as a Docker container in our environment. See [Docker documentation](https://docs.docker.com/) to get familiar with Docker. Our Dockerfiles do have a simple structure which is the same for each tool:

```sh
# Use following version of Node as the base image
FROM node:9

# Set work directory for run/cmd
WORKDIR /app

# Copy package.json into work directory and install dependencies
COPY package.json /app/package.json
RUN npm install

# Copy everthing else in work directory
COPY . /app

# Run node
CMD ["node", "/app/index.js"]
```

All docker containers are publicly available on [Docker Hub](https://hub.docker.com/), just search for our organization _nzzonline_ to get the container list. 

We use Rancher to host our containers. See [Rancher Website](https://rancher.com/) or [Rancher documentation](https://docs.rancher.com) for more information. You can setup your whole environment differently and without Docker of course. 

## Travis

[Travis](https://travis-ci.com/) is our continious integration service of choice. If you want to learn how to set it up, consult the [Travis documentation](https://docs.travis-ci.com/). The build includes execution of tests, creation and push of the docker container to docker hub as well as, if the current branch is staging, the automatic upgrade of the docker container in Rancher. 

```yml
dist: trusty
sudo: true
services:
- docker
language: node_js
node_js:
- '8'
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
cache:
  directories:
  - node_modules
```
