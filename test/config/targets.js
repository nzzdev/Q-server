const Confidence = require("confidence");

const targets = {
  pub1: {
    label: "Pub1",
    type: "web",
    context: {
      stylesheets: [
        {
          url:
            "https://proxy.st-cdn.nzz.ch/context-service/stylesheet/all/nzz.ch.css"
        }
      ],
      background: {
        color: "white"
      }
    },
    additionalRenderingInfo: {
      stylesheets: [
        {
          name: "test.css"
        }
      ],
      sophieModules: {
        $filter: "env",
        production: [
          {
            name: "sophie-q@1"
          }
        ],
        $default: [
          {
            name: "sophie-q%23master"
          }
        ]
      }
    }
  },
  pub2: {
    label: "pub2",
    type: "web",
    context: {
      stylesheets: [
        {
          url:
            "https://proxy.st-cdn.nzz.ch/context-service/stylesheet/all/nzzas.nzz.ch.css"
        }
      ],
      background: {
        color: "green"
      }
    }
  },
  fail: {
    label: "fail",
    type: "web",
    context: {
      stylesheets: [
        {
          url:
            "https://proxy.st-cdn.nzz.ch/context-service/stylesheet/all/nzzas.nzz.ch.css"
        }
      ],
      background: {
        color: "red"
      }
    }
  }
};

const env = process.env.APP_ENV || "local";
const store = new Confidence.Store(targets);

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria);
  return store.get(key, criteria);
};

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria);
  return store.meta(key, criteria);
};
