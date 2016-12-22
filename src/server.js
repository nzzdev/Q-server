const Hapi = require('hapi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');
const Joi = require('joi');
const Pack = require('../package');
const Repo = require('./repository');

const server = new Hapi.Server();
server.connection({
        port: 3000
    });

const options = {
    info: {
            'title': 'Q service API Documentation',
            'version': Pack.version,
        }
    };

// plugin registration for hapi
server.register([
    Inert,
    Vision,
    {
        'register': HapiSwagger,
        'options': options
    }], (err) => {
        server.start( (err) => {
           if (err) {
                console.log(err);
            } else {
                console.log('Server running at:', server.info.uri);
            }
        });
    });

server.route({
    method: 'GET',
    path: '/{id}',
    config: {
        handler: function (request, reply) {
            reply(Repo.fetchItemTool(request.params.id));
        },
        description: 'Get Q-item',
        notes: 'dev',
        tags: ['api']
    }
});