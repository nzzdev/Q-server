const Hoek = require('hoek');
const expect = require('chai').expect;
const server = require('../server.js');
const routes = require('../routes/routes.js');
const plugins = require('../server-plugins');
var etag;


server.register(plugins, (err) => {
	Hoek.assert(!err, err);

  server.route(routes);

  server.start(err => {
    Hoek.assert(!err, err);
  })
});

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
  

