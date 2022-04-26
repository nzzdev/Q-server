const { exec } = require("child_process");
const Hoek = require("@hapi/hoek");

module.exports = {
  name: "print",
  register: async function(server, options) {
    exec("convert --version", function (error, stdout, stderr) {
      if (error) throw new Error("It seems that ImageMagick is not installed. Please install it and try again.");
    });
    Hoek.assert(
      typeof options.colsToMm === "function",
      "options.colsToMm must be a function"
    );
    Hoek.assert(
      typeof options.target === "string",
      "options.target must be a string"
    );
    
    server.method("plugins.q.print.colsToMm", options.colsToMm);
    server.settings.app.print = {
      profiles: options.profiles,
      target: options.target,
    };

    return server.route(
      [].concat([
        require("./rendering-info.js"),
        require("./rendering-info-preview.js")
      ])
    );
  }
};
