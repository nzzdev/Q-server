var environment;
if (process.env.APP_ENV === "dev") {
    environment = require('../config/environments/dev');
} else {
    environment = require('../config/environments/local');
}

module.exports = environment;