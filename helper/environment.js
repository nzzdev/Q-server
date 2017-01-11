var environment;
switch (process.env.APP_ENV) {
    case "prod": 
        environment = require('../config/environments/prod');
        break;
    case "staging":
        environment = require('../config/environments/staging');
        break;
    case "local":
        environment = require('../config/environments/local');
        break;
    default: 
        environment = require('../config/environments/staging');
}

module.exports = environment;