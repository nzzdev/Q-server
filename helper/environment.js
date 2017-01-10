var environment;
if (process.env.APP_ENV === "staging") {
    environment = require('../config/environments/staging');
} else {
    environment = require('../config/environments/local');
}

module.exports = environment;