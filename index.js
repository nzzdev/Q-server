const server = require('./server.js');
const routes = require('./routes/routes');
const plugins = require('./server-plugins');

server.register(plugins, function(err) {
    if (err) {
        console.error('Failed to load plugins:', err);
    }

    server.route(routes);

    server.start(function() {
        console.log('Server running at: ', server.info.uri)
    })
});
