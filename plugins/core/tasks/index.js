const Hoek = require("hoek");

const defaults = {
  tasksConfig: {}
};

module.exports = {
  name: "q-tasks",
  register: async function(server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);
    settings.tasksConfig.tasks.forEach(task => {
      server.route(task.route);
    });
    server.route({
      path: "/tasks",
      method: "GET",
      options: {
        description: "Returns configuration for tasks",
        tags: ["api", "tasks"],
        auth: "q-auth",
        cors: {
          credentials: true
        }
      },
      handler: (request, h) => {
        settings.tasksConfig.tasks.forEach(task => {
          delete task.route.handler;
        });
        return settings.tasksConfig;
      }
    });
  }
};
