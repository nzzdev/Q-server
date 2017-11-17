const Confidence = require('confidence');

const editorConfig = {
  auth: {
    type: 'token' 
  },
  languages: [
    {
      key: 'de',
      label: 'de'
    }
  ],
  departments: [
    "departement1",
    "departement2",
  ],
  publications: [
    {
      key: 'pub1',
      label: 'Pub1',
      previewTarget: 'pub1'
    },
    {
      key: 'pub2',
      label: 'Pub2',
      previewTarget: 'pub2'
    }
  ],
  lowNewItems: {
    threshold: 60,
    days: 7
  },
  itemList: {
    itemsPerLoad: 18
  },
  schemaEditor: {
    geojson: {
      layer: {
        url: `http://tile.stamen.com/toner/{z}/{x}/{y}.png`,
        config: {
          attribution: '<a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        },
        maxZoom: 18,
      }
    }
  },
  help: {
    intro: 'help intro',
    faq: [
      {
        question: 'question',
        answer: 'answer'
      }
    ]
  },
  stylesheets: [
    {
      // load some 3rd party stylesheet
      url: 'https://fonts.googleapis.com/css?family=Merriweather:400,900|Roboto:400,700&subset=latin,latin'
    }
  ],
  uiBehavior: {
    useItemDialogToActivate: false
  },
  metaInformation: {
    articlesWithItem: {
      endpoint: {
        path: 'meta/articles-with-item/{id}'
      }
    }
  },
  eastereggs: {
    sounds: {
      m: 'https://storytelling.nzz.ch/m.mp3',
      q: 'https://storytelling.nzz.ch/q.mp3',
      bondTheme: 'https://storytelling.nzz.ch/bond-theme.mp3'
    }
  }
}

const env = process.env.APP_ENV || 'local';
const store = new Confidence.Store(editorConfig);

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.get(key, criteria)
}

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria)
  return store.meta(key, criteria)
}
