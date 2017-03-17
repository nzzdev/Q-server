---
title: About Targets
---
With Q we want to provide the possibility to render graphical elements for diverse targets, i.e. differently styled websites, different devices (desktop, info screens, mobile) and different applications (browser, native apps).

For that purpose you have the following options to configure target specifics:
-  __Target definition__: define targets in _config/targets.js_
-  __Target tool correlation__: configure additional stylesheets and endpoints in _config/tools.js_

# Target definition
This configuration is used to display a target specific preview of a Q item and to provide the target specific embed code in Q editor.
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

# Target tool correlation

Depending on the target each tool can can deliver rendering information differently. Please see [Rendering Info?](rendering-info.html) for more information what we mean with that term. E.g. if your target cannot render any markup you can deliver an image instead. For that purpose you would have to specify another endpoint in your tool configuration (and of cource implement that endpoint in the tool itself). In the following example the endpoint is the same - _/rendering-info/html-static_ - for both targets, but different additional stylesheets are being loaded, specified in the stylesheets array.

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
              content: demo2Styles
            }
          ]
        }
      }
  //...
}
```

Additionally further styles can be configured for each target individually. All stylesheets, i.e. tool specific stylesheets coming from the response of the tool rendering info endpoint and target specific styles either coming from styleheet files (see example above) or inline like that will be merged together in Q server.

```javascript
// additional styles for specific targets can be configured here 
// they will be merged with stylesheets of rendering info
// naming: add target key in front of "Styles"
const demo2Styles = `
  .s-font-note {
    color: black;
    font-size: 14px;
  }
  .s-font-note-s {
    color: black;
    font-size: 12px;
  }
  .s-font-title-xs {
    color: black;
    font-weight: bold;
    font-size: 12px;
  }
  .s-q-item__title {
    font-family: serif;
    font-size: 16px;
    color: black;
  }
  .s-q-item__footer {
    font-family: serif;
    font-size: 12px;
    color: black;
  }
`;
```

