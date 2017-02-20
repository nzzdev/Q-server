const Hoek = require('hoek');
const expect = require('chai').expect;
const routes = require('../routes/routes.js');
const plugins = require('../server-plugins');
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
  ]
};

const server = new Hapi.Server(hapiOptions);
server.connection({
  port: 3001
});

server.register(plugins, (err) => {
  Hoek.assert(!err, err);

  server.route(routes);

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


