const Hoek = require('hoek');
const expect = require('chai').expect;
const setServer = require('../server.js').setServer;
const Hapi = require('hapi');

const hapiOptions = {
  cache: [
    {
      name: 'memoryCache',
      engine: require('catbox-memory'),
      options: {
        maxByteSize: 150000000
      }
    }
  ],
  app: {
    misc: require('./config/misc.js'),
    tools: require('./config/tools.js')
  }
};

const server = new Hapi.Server(hapiOptions);
server.connection({
  port: 3001
});

setServer(server);

const plugins = require('../server-plugins');
const getRoutes = require('../routes/routes.js').getRoutes;

server.register(plugins, (err) => {
  Hoek.assert(!err, err);

  // mock the auth strategy
  server.auth.scheme('mock', function(server, options) {
    return {
      authenticate: function(request, reply) {
        return reply({credentials: 'user'});
      }
    };
  });
  server.auth.strategy('q-auth', 'mock');

  server.route(getRoutes());

  server.start(err => {
    Hoek.assert(!err, err);
  })
});

var etag;
describe('Q server API etags', () => {
  it('should return 200 for first call of /version', function(done) {
    server.inject('/version', (res) => {
      etag = res.headers.etag;
      expect(res.statusCode).to.be.equal(200);
      done();
    });
  })

  it('should return 304 for second call of /version', function(done) {
    const request = {
      method: 'GET',
      url: '/version',
      headers: {
        'if-none-match': etag
      }
    }
    server.inject(request, (res) => {
      expect(res.statusCode).to.be.equal(304);
      done();
    });
  })
})

describe('Q server health check', () => {
  it('should return 200 for health check', function(done) {
    server.inject('/health', (res) => {
      expect(res.statusCode).to.be.equal(200);
      done();
    });
  })
})

describe('Q server /item', () => {
  it('should fail to save existing item using POST', function(done) {
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
    server.inject(request, (res) => {
      expect(res.statusCode).to.be.equal(400);
      done();
    });
  });

  it('should fail to save new item using PUT', function(done) {
    const request = {
      method: 'PUT',
      credentials: {username: 'user', password: 'pass'},
      url: '/item',
      payload: {
        'title': 'title'
      }
    }
    server.inject(request, (res) => {
      expect(res.statusCode).to.be.equal(400);
      done();
    });
  });
})


