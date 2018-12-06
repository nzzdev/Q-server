const Confidence = require("confidence");

const tasks = {
  tasksConfig: {
    tasks: [
      {
        id: "testTask",
        name: "test",
        route: {
          path: "/tasks/test",
          method: "POST",
          options: {
            auth: "q-auth",
            cors: {
              credentials: true
            }
          },
          handler: async function(request, h) {
            return {
              type: "json",
              data: {
                label: "test 1",
                content: request.payload
              }
            };
          }
        },
        schema: {
          type: "object",
          properties: {
            someTaskInput: {
              title: "task input",
              type: "string"
            }
          }
        },
        onlyRoles: ["admin"]
      }
    ]
  }
};

const env = process.env.APP_ENV || "local";
const store = new Confidence.Store(tasks);

module.exports.get = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria);
  return store.get(key, criteria);
};

module.exports.meta = (key, criteria = {}) => {
  criteria = Object.assign({ env: env }, criteria);
  return store.meta(key, criteria);
};
