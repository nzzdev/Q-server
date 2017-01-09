const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const Pack = require('./package');
const server = require('./server.js');
const routes = require('./routes/routes');

const options = {
    info: {
            'title': 'Q server API Documentation',
            'version': Pack.version,
        }
    };

var plugins = [
    Inert,
    Vision,
    {
        'register': HapiSwagger,
        'options': options
    }
]

server.register(plugins, function(err) {
    if (err) {
        console.error('Failed to load plugins:', err);
    }

    server.route(routes);

    server.start(function() {
        console.log('Server running at: ', server.info.uri)
    })
});
