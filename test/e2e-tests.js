const Lab = require('lab');
const Code = require('code');
const Hapi = require('hapi');
const Boom = require('boom');
const lab = exports.lab = Lab.script();

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const package = require('../package.json');

let server = Hapi.server({
  port: process.env.PORT || 3001,
  app: {
    tools: require('./config/tools.js'),
    targets: require('./config/targets.js'),
  },
  routes: {
    cors: true
  }
});

// mock the auth strategy
server.auth.scheme('mock', function(server, options) {
  return {
    authenticate: function(request, h) {
      return {credentials: 'user'};
    }
  };
});
server.auth.strategy('q-auth', 'mock');

const plugins = [
  {
    plugin: require('../plugins/core/base'),
    options: require('./config/base.js')
  },
  {
    plugin: require('../plugins/core/db'),
    options: {
      protocol: 'http',
      host: 'localhost:5984',
      database: 'q-items'
    }
  },
  {
    plugin: require('../plugins/core/editor'),
    options: {
      editorConfig: require('./config/editor.js').get('')
    }
  },
  {
    plugin: require('../plugins/core/rendering-info'),
    options: require('./config/rendering-info.js')
  },
  {
    plugin: require('../plugins/statistics')
  },
  {
    plugin: require('../plugins/screenshot'),
    options: {
      getScripts: function(renderingInfo) {
        const scripts = [];
        if (renderingInfo.loaderConfig && renderingInfo.loaderConfig.loadSystemJs === 'full') {
          scripts.push({url: `${process.env.Q_SERVER_BASE_URL}/files/system.js`});
        }
        if (renderingInfo.loaderConfig && renderingInfo.loaderConfig.polyfills) {
          scripts.push({url: `https://cdn.polyfill.io/v2/polyfill.min.js?features=${renderingInfo.loaderConfig.polyfills.join(',')}`});
        }
        if (renderingInfo.scripts && Array.isArray(renderingInfo.scripts)) {
          for (let script of renderingInfo.scripts) {
            script = resolvePath(script);
            if (script.url && script.url.includes('track-manager')) {
              continue;
            }
            scripts.push(script);
          }
        }
        return scripts;
      },
      getStylesheets: function(renderingInfo) {
        const stylesheets = [];
        if (renderingInfo.stylesheets && Array.isArray(renderingInfo.stylesheets)) {
          for (let stylesheet of renderingInfo.stylesheets) {
            stylesheet = resolvePath(stylesheet);
            stylesheets.push(stylesheet);
          }
        }
        return stylesheets;
      }
    }
  }
]

let pouchdbServer;
before(async () => {
  try {
    // start the tool mock server
    await require('./mock/tool.js').start();

    const { spawn } = require('child_process');
    pouchdbServer = spawn('./node_modules/pouchdb-server/bin/pouchdb-server', ['-c','test/pouchdb-server-config.json', '--in-memory']);
    
    // wait a second to give pouchdbServer time to boot
    await new Promise(resolve => {
      setTimeout(resolve, 1000);
    });
    
    console.log('started pouchdb server with pid', pouchdbServer.pid);
    const setupCouch = await require('./mock/couchdb.js').setupCouch;

    await setupCouch();

    debugger;

    await server.register(plugins);
    await server.start();
  }
  catch (err) {
    expect(err).to.not.exist();
  }
});

after(() => {
  server = null;
  console.log('\ngoing to kill pouchdb server with pid', pouchdbServer.pid);
  pouchdbServer.kill('SIGHUP');
  console.log('killed?', pouchdbServer.killed);
  return;
});

lab.experiment('basics', () => {

  it('starts the server', () => {
    expect(server.info.created).to.be.a.number();
  });

  it('is healthy', async () => {
    const response = await server.inject('/health');
    expect(response.payload).to.equal('Q server is alive');
  });

  it('returnes its version', async () => {
    const response = await server.inject('/version');
    expect(response.payload).to.equal(package.version);
  });

});

lab.experiment('core base', () => {

  it('returnes Cache-Control: public if no config given', async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig();
    expect(configCacheControl[0]).to.be.equal('public');
  });

  it('returnes correct cache control header if maxAge given', async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig({
      maxAge: 1
    });
    expect(configCacheControl[0]).to.be.equal('public');
    expect(configCacheControl[1]).to.be.equal('max-age=1');
  });

  it('returnes correct cache control header if sMaxAge given', async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig({
      sMaxAge: 1
    });
    expect(configCacheControl[0]).to.be.equal('public');
    expect(configCacheControl[1]).to.be.equal('s-maxage=1');
  });

  it('returnes correct cache control header if staleWhileRevalidate given', async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig({
      staleWhileRevalidate: 1
    });
    expect(configCacheControl[0]).to.be.equal('public');
    expect(configCacheControl[1]).to.be.equal('stale-while-revalidate=1');
  });

  it('returnes correct cache control header if staleIfError given', async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig({
      staleIfError: 1
    });
    expect(configCacheControl[0]).to.be.equal('public');
    expect(configCacheControl[1]).to.be.equal('stale-if-error=1');
  });
  
  it('computes correct cache control headers if all config given', async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig(require('./config/base.js').get('/cache/cacheControl'));
    expect(configCacheControl[0]).to.be.equal('public');
    expect(configCacheControl[1]).to.be.equal('max-age=1');
    expect(configCacheControl[2]).to.be.equal('s-maxage=1');
    expect(configCacheControl[3]).to.be.equal('stale-while-revalidate=1');
    expect(configCacheControl[4]).to.be.equal('stale-if-error=1');
  });

});

lab.experiment('core item', () => {
  
  it('returnes existing item from db', { plan: 2 }, async () => {
    const response = await server.inject('/item/mock-item-inactive');
    expect(response.statusCode).to.be.equal(200);
    const item = JSON.parse(response.payload);
    expect(item._id).to.be.equal('mock-item-inactive');
  });

  it('should fail to save existing item using POST', async () => {
    const request = {
      method: 'POST',
      credentials: {username: 'user', password: 'pass'},
      url: '/item',
      payload: {
        '_id': 'someid',
        '_rev': 'somerev',
        'title': 'title'
      }
    }
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(400);
  });

  it('should fail to save new item using PUT', async () => {
    const request = {
      method: 'PUT',
      credentials: {username: 'user', password: 'pass'},
      url: '/item',
      payload: {
        'title': 'title'
      }
    }
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(400);
  });

});

lab.experiment('rendering-info', () => {

  it('returnes 403 for inactive item if no ignoreInactive given', { plan: 1 }, async () => {
    const response = await server.inject('/rendering-info/mock-item-inactive/pub1');
    expect(response.statusCode).to.be.equal(403);
  });

  it('returnes the rendering info for inactive item if ignoreInactive=true given', { plan: 3 }, async () => {
    const response = await server.inject('/rendering-info/mock-item-inactive/pub1?ignoreInactive=true');
    expect(response.statusCode).to.be.equal(200);
    expect(response.result.scripts).to.be.an.array();
    expect(response.result.stylesheets).to.be.an.array();
  });

});
