const Hoek = require("@hapi/hoek");

const defaults = {
  tasksConfig: {},
};

module.exports = {
  name: "q-tasks",
  register: async function (server, options) {
    const settings = Hoek.applyToDefaults(defaults, options);
    settings.tasksConfig.tasks.forEach((task) => {
      server.route(task.route);
    });
    server.route({
      path: "/tasks",
      method: "GET",
      options: {
        description: "Returns configuration for tasks",
        tags: ["api", "tasks"],
        auth: {
          strategies: ["q-auth-azure", "q-auth-ld"],
        },
        cors: {
          credentials: true,
        },
      },
      handler: (request, h) => {
        return {
          tasks: settings.tasksConfig.tasks
            .filter((task) => {
              // if the tasks has no onlyRoles property, it's available for everyone
              if (!task.hasOwnProperty("onlyRoles")) {
                return true;
              }
              // otherwise we only include it in the config if the authenticated user as roles in the credentials and these roles include one role defined in onlyRoles.
              return task.onlyRoles.some(
                (role) =>
                  request.auth.credentials.roles &&
                  request.auth.credentials.roles.includes(role)
              );
            })
            .map((task) => {
              delete task.route.handler;
              return task;
            }),
        };
      },
    });
  },
};
