module.exports = {
  path: "/editor/targets",
  method: "GET",
  options: {
    description: "Returns all configured targets",
    tags: ["api", "editor"]
  },
  handler: (request, h) => {
    const targets = request.server.settings.app.targets.get("");

    // the follwoing is done for backwards compatibility reasons.
    // Q-editor wants an array of targets, which makes sense.
    // Q-server <= 6.3.2 wanted to have a confidence store with an array as the toplevel structure and returned this directly.
    // this is not working with confidence >= 4 anymore as the store should be an object at the top level.
    // the code here transforms the target object into an array of targets for Q-editor to consume
    // the compatibility code could be removed in the future in a Q-server breaking change
    if (Array.isArray(targets)) {
      return targets;
    }
    return Object.keys(targets).map(key => {
      return {
        ...request.server.settings.app.targets.get(`/${key}`),
        key: key
      };
    });
  }
};
