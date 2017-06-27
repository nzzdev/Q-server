---
title: About Targets
---
With Q we want to provide the possibility to render visual elements based on the same data for diverse targets, i.e. differently styled websites, different devices (desktop, info screens, mobile) and different applications (browser, native apps).

So, in a nutshell we have to deal with two groups of target specifics. 
-  __Styling related specifics__: e.g. your targets are two different websites with a different set of fonts and other styles 
-  __Technology related specifics__: your targets are different applications which can interpret markup or not

## Styling related specifics
For each tool - target - environment combination styles can be configured in _config/tools.js_ of your Q server implementation. That can be done either:
- by specifying a `url` or
- by specifying a string with the styles in `content`

```javascript
const tools = {
  $filter: 'env',
  production: {
    election_executive: {
    //...
    endpoint: {
      $filter: 'target',
      $default: false,
      demo1: {
        path: '/rendering-info/html-static', // endpoint path to get rendering info for this specific target
        stylesheets: [ // target specific stylesheets to load
          {
            url: 'https://service.sophie.nzz.ch/bundle/sophie-q@^1,sophie-font@^1,sophie-color@^1.css' 
          },
          {
            content: '.q-item { color: #f5f5f5; background-color: #f5f5f5; }'
          }
        ]
      },
      demo2: {
        path: '/rendering-info/html-static',
        stylesheets: [
          {
            url: 'https://service.sophie.nzz.ch/bundle/sophie-color@^1.css'
          },
          {
            content: '.q-item { color: #f5f5f5; background-color: #f5f5f5; }'
          },
          {
            content: '.s-font-note { color: black; font-size: 14px; }'
          }
        ]
      }
    }
  //...
  }
  //...
}
```

## Technology related specifics
Depending on the technical scope of a target different forms of rendering information may be provided by each tool. E.g. if your target cannot render any markup you may deliver an image instead. Please see [Rendering Info?](rendering-info.html) for details on that topic. 

For that purpose you have to define an endpoint for each target and tool combination in _config/tools.js_ of your Q server implementation. Otherwise, Q server will respond with `Not implemented` when trying to get rendering information for a Q item of a particular tool type and target.

Of course all of the specified endpoints per tool have to be implemented as well in the tool itself.

In the following example both targets - _demo1_ and _demo2_ - get its rendering info from the same endpoint of tool _election executive_

```javascript
const tools = {
  //...
    election_executive: {
      //...
      endpoint: {
        $filter: 'target',
        $default: false,
        demo1: {
          path: '/rendering-info/html-static', // endpoint path to get rendering info for this specific target
          //...
        },
        demo2: {
          path: '/rendering-info/html-static',
          //...
        },
        demo3: {
          url: 'https://some-other-service.example.com/rendering-info', // you can use url to use an external service providing the rendering information
          //...
        }
      }
  //...
}
```


## Preview in Q editor

To have a preview environment that matches your target as close as possible, you can configure stylesheets and scripts that will be loaded within the Shadow Root of the preview element in Q editor in _config/targets.js_. Use these to load any stylesheets and scripts that may influence the behaviour of your visual element when embedded in the target environment.

```javascript
const targets = [
  {
    key: 'demo1',
    label: 'Demo 1',
    preview: {
      stylesheets: [
        /*{
          url: 'url to stylesheet specific for target'
        }*/
      ]
    },
    browserLoaderUrl: 'https://q.nzz.ch/Q-demo-loader/loader1.js' // used to generate embed code to graphic
  },
  {
    key: 'demo2',
    label: 'Demo 2',
    preview: {
      stylesheets: [
        /*{
          url: 'url to stylesheet specific for target'
        }*/
      ]
    },
    browserLoaderUrl: 'https://q.nzz.ch/Q-demo-loader/loader2.js' // used to generate embed code to graphic
  }
]
```


