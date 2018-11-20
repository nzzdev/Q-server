const Hoek = require("hoek");

const defaults = {
  tasksConfig: {}
};

module.exports = {
  name: "q-tasks-api",
  register: async function(server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);
    settings.tasksConfig.tasks.forEach(task => {
      server.route(task.route);
    });
    server.route({
      path: "/tasks",
      method: "GET",
      options: {
        description: "Returns configuration for Q Tasks",
        tags: ["api", "tasks"]
      },
      handler: (request, h) => {
        return settings.tasksConfig;
      }
    });
  }
};
