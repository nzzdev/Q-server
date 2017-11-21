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

let server = require('./server.js').getServer();
const plugins = require('./plugins');

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

    await server.register(plugins);
    await server.start();
  }
  catch (err) {
    expect(err).to.not.exist();
  }
});

after(async () => {
  await server.stop({ timeout: 2000 });
  server = null;
  console.log('\ngoing to kill pouchdb server with pid', pouchdbServer.pid);
  pouchdbServer.kill('SIGHUP');
  console.log('killed?', pouchdbServer.killed, '\n');
  if (!pouchdbServer.killed) {
    console.log('somehow i could not kill your pouchdb server. maybe another one is still running. check with "lsof -i:5984" and kill it yourself');
  }
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

lab.experiment('core item', () => {
  
  it('returnes existing item from db', { plan: 2 }, async () => {
    const response = await server.inject('/item/mock-item-inactive');
    expect(response.statusCode).to.be.equal(200);
    const item = JSON.parse(response.payload);
    expect(item._id).to.be.equal('mock-item-inactive');
  });

  it('should respond with 400 if trying to save existing item using POST', async () => {
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

  it('should respond with 400 if trying to save new item using PUT', async () => {
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

  it('should respond with 400 if trying to save item that does not validate against schema and tell the error', async () => {
    const request = {
      method: 'PUT',
      credentials: {username: 'user', password: 'pass'},
      url: '/item',
      payload: {
        '_id': 'some-id',
        '_rev': 'some_rev',
        'title': 'title',
        'tool': 'tool1'
      }
    }
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(400);
    expect(response.result.message).to.be.equal(`{"keyword":"required","dataPath":"","schemaPath":"#/required","params":{"missingProperty":"foo"},"message":"should have required property 'foo'"}`);
  });

  it('should save a new item if it validates against schema', async () => {
    try {
      const request = {
        method: 'POST',
        credentials: {username: 'user', password: 'pass'},
        url: '/item',
        payload: {
          title: 'some-new-item-from-test',
          tool: 'tool1',
          foo: 'bar'
        }
      };
      const response = await server.inject(request);
      expect(response.statusCode).to.be.equal(200);
    } catch (err) {
      expect(err).to.be.undefined();
    }
  });

  it('should save an existing item if it validates against schema', async () => {
    try {
      const itemResponse = await server.inject('/item/mock-item-to-test-edits');
      const item = JSON.parse(itemResponse.payload);
      let value = Date.now();
      item.bar = value;
      const request = {
        method: 'PUT',
        credentials: {username: 'user', password: 'pass'},
        url: '/item',
        payload: item
      };
      const response = await server.inject(request);
      expect(response.statusCode).to.be.equal(200);

      const newItemResponse = await server.inject('/item/mock-item-to-test-edits');
      const newItem = JSON.parse(newItemResponse.payload);
      expect(newItem.bar).to.equal(value);
    } catch (err) {
      expect(err).to.be.undefined();
    }
  });

});

lab.experiment('core tool proxy routes', () => {
  
  it('returnes Not Found if no config for given tool available', { plan: 1 }, async () => {
    const response = await server.inject('/tools/inexisting_tool/stylesheet/test.123.css');
    expect(response.statusCode).to.be.equal(404);
  });

  it('passes the querystring for tool-default route on to the tool', { plan: 1 }, async () => {
    const response = await server.inject('/tools/tool1/stylesheet/test.123.css?background=red');
    expect(response.result).to.be.equal('body { background: red; }');
  });
  
  it('returnes stylesheet from tool when requested', { plan: 1 }, async () => {
    const response = await server.inject('/tools/tool1/stylesheet/test.123.css');
    expect(response.result).to.be.equal('body { background: black; }');
  });

  it('returnes correct cache-control header when responding from tool', { plan: 1 }, async () => {
    const response = await server.inject('/tools/tool1/stylesheet/test.123.css');
    expect(response.headers['cache-control']).to.be.equal("max-age=31536000,immutable,public=true,s-maxage=1,stale-while-revalidate=1,stale-if-error=1");
  });

});

lab.experiment('core rendering-info', () => {

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

  it('returnes an error if tool endpoint is not properly configured', { plan: 2 }, async () => {
    const response = await server.inject('/rendering-info/mock-item-from-wrong-configured-tool/pub1');
    expect(response.statusCode).to.be.equal(503);
    expect(response.result.message).to.be.equal('Endpoint has no path nor url configured');
  });

  it('returnes an error if rendering-info tool endpoint returnes one', { plan: 1 }, async () => {
    const response = await server.inject('/rendering-info/mock-item-active/fail');
    expect(response.statusCode).to.be.equal(500);
  });

});

lab.experiment('core editor endpoints', () => {
  it('returnes the editor config', async () => {
    const response = await server.inject('/editor/config');

    // test various settings from the config, no need to test them all
    expect(response.result.departments[0]).to.be.equal('department1');
    expect(response.result.stylesheets[0].url).to.be.equal('https://fonts.googleapis.com/css?family=Merriweather:400,900|Roboto:400,700&subset=latin,latin');
    expect(response.result.auth.type).to.be.equal('token');
  });

  it('returnes correctly generates translation file with tool names for given locale', async () => {
    const responseDe = await server.inject('/editor/locales/de/translation.json');
    expect(responseDe.result.tool1).to.be.equal('tool1_de');
    expect(responseDe.result.tool2).to.be.undefined();

    const responseEn = await server.inject('/editor/locales/en/translation.json');
    expect(responseEn.result.tool1).to.be.equal('tool1_en');

    const responseInexistingLanguage = await server.inject('/editor/locales/inexistingLanguage/translation.json');
    expect(responseInexistingLanguage.result.tool1).to.be.undefined();
  });

  it('returnes the tool editor configs', async () => {
    const response = await server.inject('/editor/tools');
    expect(response.result[0].name).to.be.equal('tool1');
    expect(response.result[0].icon).to.be.equal('<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 31h32v1H0zM25 0h6v30h-6zm-8 6h6v24h-6zm-8 7h6v17H9zm-8 5h6v12H1z" fill-rule="evenodd"/></svg>');
    expect(response.result[1].name).to.be.equal('tool2');
    expect(response.result[1].icon).to.be.equal('<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 31h32v1H0zM25 0h6v30h-6zm-8 6h6v24h-6zm-8 7h6v17H9zm-8 5h6v12H1z" fill-rule="evenodd"/></svg>');
  });

  it('returnes the target configs', async () => {
    const response = await server.inject('/editor/targets');
    expect(response.result).to.be.an.array();
    expect(response.result[0].key).to.be.equal('pub1');
  });
});
