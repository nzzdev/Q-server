module.exports = {
  path: "/editor/targets",
  method: "GET",
  options: {
    description: "Returns all configured targets",
    tags: ["api", "editor"]
  },
  handler: (request, h) => {
    let targets = request.server.settings.app.targets.get("");

    // the follwoing is done for Q-editor compatibility reasons.
    // Q-editor wants an array of targets, which makes sense for how this is used in the editor.
    // Q-server < 7.0.0 wanted to have a confidence store with an array as the toplevel structure and returned this directly.
    // this is not working with confidence >= 4 anymore as the store should be an object at the top level.
    // the code here transforms the target object into an array of targets for Q-editor to consume
    // the compatibility code could be removed in the future in a Q-server breaking change
    targets = Object.keys(targets).map(key => {
      return {
        ...request.server.settings.app.targets.get(`/${key}`),
        key: key
      };
    });

    // check on exportableTargets if the target is actually configured for the tool
    // compile onlyTools from this
    return targets.map(target => {
      if (target.userExportable) {
        // append target.userExportable.onlyTools with the tools that have the exportable endpoint configured
        const tools = request.server.settings.app.tools.get("/", {
          target: target.key
        });
        target.userExportable.onlyTools = Object.keys(tools).filter(
          toolName => {
            return tools[toolName].endpoint;
          }
        );
      }
      return target;
    });
  }
};
