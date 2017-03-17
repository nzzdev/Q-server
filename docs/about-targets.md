---
title: About Targets
---
With Q we want to provide the possibility to render graphical elements for diverse targets, i.e. differently styled websites, different devices (desktop, info screens, mobile) and different applications (browser, native apps).

So, in a nutshell we have to deal with two groups of target specifics. 
-  __Styling related specifics__: e.g. your targets are two different websites with a different set of styles and fonts 
-  __Technology related specifics__: your targets are different applications which can interpret markup or not

# Styling related specifics
_Ausformulieren:_
- stylesheets in targets.js mainly used for preview (these style will be on the target side anyway but in order to get the right preview, we need them here)
- stylesheets in tools.js either as links to stylesheet files or inline -> will be merged all together in the end

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

# Technology related specifics
_Noch mal drüber und allenfalls umformulieren:_
Depending on the target each tool can can deliver rendering information differently. Please see [Rendering Info?](rendering-info.html) for more information what we mean with that term. E.g. if your target cannot render any markup you can deliver an image instead. For that purpose you would have to specify another endpoint in your tool configuration (and of cource implement that endpoint in the tool itself). In the following example the endpoint is the same - _/rendering-info/html-static_ - for both targets,

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
        }
      }
  //...
}
```




