const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const lab = (exports.lab = Lab.script());

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const package = require("../package.json");

let server = require("./server.js").getServer();
const plugins = require("./plugins");

let pouchdbServer;
before(async () => {
  try {
    // start the tool mock server
    await require("./mock/tool1.js").start();
    await require("./mock/tool2.js").start();

    const { spawn } = require("child_process");
    pouchdbServer = spawn("./node_modules/pouchdb-server/bin/pouchdb-server", [
      "-c",
      "test/pouchdb-server-config.json",
      "--in-memory"
    ]);

    // wait a second to give pouchdbServer time to boot
    await new Promise(resolve => {
      setTimeout(resolve, 1000);
    });

    console.log("started pouchdb server with pid", pouchdbServer.pid);
    const setupCouch = await require("./mock/couchdb.js").setupCouch;

    await setupCouch();

    await server.register(plugins);
    await server.start();
  } catch (err) {
    expect(err).to.not.exist();
  }
});

after(async () => {
  console.log("\ngoing to kill pouchdb server with pid", pouchdbServer.pid);
  pouchdbServer.kill("SIGHUP");
  console.log("killed?", pouchdbServer.killed, "\n");
  if (!pouchdbServer.killed) {
    console.log(
      'somehow i could not kill your pouchdb server. maybe another one is still running. check with "lsof -i:5984" and kill it yourself'
    );
  }
  await server.stop({ timeout: 2000 });
  server = null;
  return;
});

lab.experiment("basics", () => {
  it("starts the server", () => {
    expect(server.info.created).to.be.a.number();
  });

  it("is healthy", async () => {
    const response = await server.inject("/health");
    expect(response.payload).to.equal("Q server is alive");
  });

  it("returns its version", async () => {
    const response = await server.inject("/version");
    expect(response.payload).to.equal(package.version);
  });
});

lab.experiment("core item", () => {
  it("returns existing item from db", { plan: 2 }, async () => {
    const response = await server.inject("/item/mock-item-inactive");
    expect(response.statusCode).to.be.equal(200);
    const item = JSON.parse(response.payload);
    expect(item._id).to.be.equal("mock-item-inactive");
  });

  it("should respond with 400 if trying to save existing item using POST", async () => {
    const request = {
      method: "POST",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass" }
      },
      url: "/item",
      payload: {
        _id: "someid",
        _rev: "somerev",
        title: "title"
      }
    };
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(400);
  });

  it("should respond with 400 if trying to save new item using PUT", async () => {
    const request = {
      method: "PUT",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass" }
      },
      url: "/item",
      payload: {
        title: "title"
      }
    };
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(400);
  });

  it("should respond with 400 if trying to save item that does not validate against schema and tell the error", async () => {
    const request = {
      method: "PUT",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass" }
      },
      url: "/item",
      payload: {
        _id: "some-id",
        _rev: "some_rev",
        title: "title",
        tool: "tool1"
      }
    };
    const response = await server.inject(request);
    expect(response.statusCode).to.be.equal(400);
    expect(response.result.message).to.be.equal(
      `{"keyword":"required","dataPath":"","schemaPath":"#/required","params":{"missingProperty":"foo"},"message":"should have required property 'foo'"}`
    );
  });

  it("should save a new item if it validates against schema", async () => {
    try {
      const request = {
        method: "POST",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: {
          title: "some-new-item-from-test",
          tool: "tool1",
          foo: "bar"
        }
      };
      const response = await server.inject(request);
      expect(response.statusCode).to.be.equal(200);
    } catch (err) {
      expect(err).to.be.undefined();
    }
  });

  it("should save an existing item if it validates against schema", async () => {
    try {
      const itemResponse = await server.inject("/item/mock-item-to-test-edits");
      const item = JSON.parse(itemResponse.payload);
      let value = Date.now();
      item.bar = value;
      const request = {
        method: "PUT",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: item
      };
      const response = await server.inject(request);
      expect(response.statusCode).to.be.equal(200);

      const newItemResponse = await server.inject(
        "/item/mock-item-to-test-edits"
      );
      const newItem = JSON.parse(newItemResponse.payload);
      expect(newItem.bar).to.equal(value);
    } catch (err) {
      expect(err).to.be.undefined();
    }
  });

  it(
    "should emit item.new event if new item is saved",
    { plan: 1 },
    async () => {
      const id = "fix-id-to-better-test-the-case";
      const handler = ({ newItem }) => {
        expect(newItem._id).to.be.equal(id);
      };
      server.events.once("item.new", handler);
      const request = {
        method: "POST",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: {
          _id: "fix-id-to-better-test-the-case",
          title: "some-new-item",
          tool: "tool1",
          foo: "bar"
        }
      };
      const response = await server.inject(request);
    }
  );

  it(
    "should emit item.update event if an existing item is updated",
    { plan: 2 },
    async () => {
      const id = "mock-item-to-test-edits";
      const handler = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      server.events.once("item.update", handler);

      const itemResponse = await server.inject("/item/mock-item-to-test-edits");
      const item = JSON.parse(itemResponse.payload);
      const request = {
        method: "PUT",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: item
      };
      const response = await server.inject(request);
    }
  );

  it(
    "should emit item.activate and item.update event if an existing item is activated",
    { plan: 4 },
    async () => {
      const id = "mock-item-to-test-edits";
      const handlerActivate = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      const handlerUpdated = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      server.events.once("item.activate", handlerActivate);
      server.events.once("item.update", handlerUpdated);

      const itemResponse = await server.inject("/item/mock-item-to-test-edits");
      const item = JSON.parse(itemResponse.payload);
      item.active = true;
      const request = {
        method: "PUT",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: item
      };
      const response = await server.inject(request);
    }
  );

  it(
    "should emit item.deactivate and item.update event if an existing active item is deactivated",
    { plan: 4 },
    async () => {
      const id = "mock-item-to-test-edits";
      const handlerDeactivate = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      const handlerUpdated = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      server.events.once("item.deactivate", handlerDeactivate);
      server.events.once("item.update", handlerUpdated);

      const itemResponse = await server.inject("/item/mock-item-to-test-edits");
      const item = JSON.parse(itemResponse.payload);
      item.active = false;
      const request = {
        method: "PUT",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: item
      };
      const response = await server.inject(request);
    }
  );

  it(
    "should emit item.delete event if an existing item is deleted",
    { plan: 4 },
    async () => {
      const id = "mock-item-to-test-edits";
      const handlerDeleted = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      const handlerUpdated = ({ newItem, oldItem }) => {
        expect(newItem._id).to.be.equal(id);
        expect(oldItem._id).to.be.equal(id);
      };
      server.events.once("item.delete", handlerDeleted);
      server.events.once("item.update", handlerUpdated);

      const itemResponse = await server.inject("/item/mock-item-to-test-edits");
      const item = JSON.parse(itemResponse.payload);
      item._deleted = true;
      const request = {
        method: "PUT",
        auth: {
          strategy: "q-auth",
          credentials: { username: "user", password: "pass" }
        },
        url: "/item",
        payload: item
      };
      const response = await server.inject(request);
    }
  );
});

lab.experiment("core tool proxy routes", () => {
  it(
    "returns Not Found if no config for given tool available",
    { plan: 1 },
    async () => {
      const response = await server.inject(
        "/tools/inexisting_tool/stylesheet/test.123.css"
      );
      expect(response.statusCode).to.be.equal(404);
    }
  );

  it(
    "passes the querystring for tool-default route on to the tool",
    { plan: 1 },
    async () => {
      const response = await server.inject(
        "/tools/tool1/stylesheet/test.123.css?background=red"
      );
      expect(response.result).to.be.equal("body { background: red; }");
    }
  );

  it("returns stylesheet from tool when requested", { plan: 1 }, async () => {
    const response = await server.inject(
      "/tools/tool1/stylesheet/test.123.css"
    );
    expect(response.result).to.be.equal("body { background: black; }");
  });

  it(
    "returns correct cache-control header when responding from tool",
    { plan: 1 },
    async () => {
      const response = await server.inject(
        "/tools/tool1/stylesheet/test.123.css"
      );
      expect(response.headers["cache-control"]).to.be.equal(
        "max-age=31536000,immutable,public=true,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
    }
  );

  it("passes the item from db in the payload of the tool request if query appendItemToPayload is set to an id of an active item for GET requests", async () => {
    const response = await server.inject(
      "/tools/tool1/endpoint-returning-the-id-from-tool-in-payload?appendItemToPayload=mock-item-active"
    );
    expect(response.result).to.be.equal("mock-item-active");
  });

  it("passes the item from db in the payload of the tool request if query appendItemToPayload is set to an id of an active item for POST requests", async () => {
    const response = await server.inject({
      url:
        "/tools/tool1/endpoint-returning-the-id-from-tool-in-payload?appendItemToPayload=mock-item-active",
      method: "POST",
      payload: {}
    });
    expect(response.result).to.be.equal("mock-item-active");
  });

  it("passes the item from db in the payload of the tool request if query appendItemToPayload is set to an id of an inactive item for GET requests", async () => {
    const response = await server.inject(
      "/tools/tool1/endpoint-returning-the-id-from-tool-in-payload?appendItemToPayload=mock-item-inactive"
    );
    expect(response.result).to.be.equal("mock-item-inactive");
  });

  it("passes the item from db in the payload of the tool request if query appendItemToPayload is set to an id of an inactive item for POST requests", async () => {
    const response = await server.inject({
      url:
        "/tools/tool1/endpoint-returning-the-id-from-tool-in-payload?appendItemToPayload=mock-item-inactive",
      method: "POST",
      payload: {}
    });
    expect(response.result).to.be.equal("mock-item-inactive");
  });

  it("fails with 404 if the item id passed as appendItemToPayload is not found for GET requests", async () => {
    const response = await server.inject(
      "/tools/tool1/endpoint-returning-the-id-from-tool-in-payload?appendItemToPayload=some-random-id-that-does-not-exist"
    );
    expect(response.statusCode).to.be.equal(404);
  });

  it("fails with 404 if the item id passed as appendItemToPayload is not found for POST requests", async () => {
    const response = await server.inject({
      url:
        "/tools/tool1/endpoint-returning-the-id-from-tool-in-payload?appendItemToPayload=some-random-id-that-does-not-exist",
      method: "POST",
      payload: {}
    });
    expect(response.statusCode).to.be.equal(404);
  });
});

lab.experiment("core rendering-info", () => {
  it(
    "returns 403 for inactive item if no ignoreInactive given",
    { plan: 1 },
    async () => {
      const response = await server.inject(
        "/rendering-info/mock-item-inactive/pub1"
      );
      expect(response.statusCode).to.be.equal(403);
    }
  );

  it(
    "returns the rendering info for inactive item if ignoreInactive=true given",
    { plan: 3 },
    async () => {
      const response = await server.inject(
        "/rendering-info/mock-item-inactive/pub1?ignoreInactive=true"
      );
      expect(response.statusCode).to.be.equal(200);
      expect(response.result.scripts).to.be.an.array();
      expect(response.result.stylesheets).to.be.an.array();
    }
  );

  it(
    "returns an error if rendering-info tool endpoint returns one",
    { plan: 1 },
    async () => {
      const response = await server.inject(
        "/rendering-info/mock-item-active/fail"
      );
      expect(response.statusCode).to.be.equal(500);
    }
  );

  it("passes itemStateInDb to the tool rendering-info endpoint if item is coming from db", async () => {
    const response = await server.inject(
      "/rendering-info/mock-item-active/pub1"
    );
    expect(response.result.markup).to.contain(
      `<h1>title - itemStateInDb: true</h1>`
    );
  });

  it("passes itemStateInDb to the tool rendering-info endpoint if item is not from db", async () => {
    const response = await server.inject({
      url: "/rendering-info/pub1",
      method: "POST",
      payload: JSON.stringify({
        item: {
          _id: "mock-item-active",
          title: "title",
          tool: "tool1"
        }
      })
    });
    expect(response.result.markup).to.contain(
      `<h1>title - itemStateInDb: false</h1>`
    );
  });

  it(
    "correctly resolves name properties in toolRuntimeConfig to path properties",
    { plan: 1 },
    async () => {
      const response = await server.inject(
        "/rendering-info/mock-item-active/pub1"
      );

      expect(response.result.stylesheets[3].path).to.be.equal(
        "/tools/tool1/stylesheet/mockstyle"
      );
    }
  );

  it(
    "correctly calls functions in additionalRenderingInfo configured in Q server before resolving any name properties in the result",
    { plan: 2 },
    async () => {
      const response = await server.inject(
        "/rendering-info/mock-item-active/pub1"
      );

      expect(response.result.stylesheets[2].path).to.be.equal(
        "/tools/tool1/stylesheet/functionGeneratedStylesheetName.css"
      );

      expect(response.result.scripts[0].content).to.be.equal(
        'console.log("functionGeneratedScriptContent");'
      );
    }
  );
});

lab.experiment(
  "correctly merges additionalRenderingInfo from tool endpoint and target config",
  () => {
    it("correctly merges arrays", { plan: 4 }, async () => {
      const response = await server.inject(
        "/rendering-info/mock-item-active/pub1"
      );

      // config from tool
      expect(response.result.stylesheets[3].name).to.be.equals("mockstyle");

      // config from tool endpoint
      expect(response.result.stylesheets[1].url).to.be.equals(
        "https://service.sophie.nzz.ch/bundle/sophie-font@^1,sophie-color@^1,sophie-viz-color@^1[general].css"
      );

      // config from target
      expect(response.result.stylesheets[0].name).to.be.equals("test.css");
      expect(response.result.sophieModules[0].name).to.be.equals(
        "sophie-q%23master"
      );
    });
  }
);

lab.experiment("correctly executes processRenderingInfo:", () => {
  it("processRenderingInfo in target config", { plan: 1 }, async () => {
    const response = await server.inject(
      "/rendering-info/mock-item-active/pub1"
    );

    expect(response.result.markup).to.contain(
      '<div style="height: 50px;">appended by processRenderingInfo function in target</div>'
    );
  });

  it("processRenderingInfo in toolEndpoint config", { plan: 1 }, async () => {
    const response = await server.inject(
      "/rendering-info/mock-item-active/pub2"
    );

    expect(response.result.loaderConfig.processRenderingInfoProp).to.be.equal(
      "processRenderingInfoValue"
    );
  });
});

lab.experiment("core editor endpoints", () => {
  it("returns the editor config", async () => {
    const response = await server.inject("/editor/config");

    // test various settings from the config, no need to test them all
    expect(response.result.departments[0]).to.be.equal("department1");
    expect(response.result.stylesheets[0].url).to.be.equal(
      "https://fonts.googleapis.com/css?family=Merriweather:400,900|Roboto:400,700&subset=latin,latin"
    );
    expect(response.result.auth.type).to.be.equal("token");
  });

  it("returns correctly generated translation file with tool names for given locale", async () => {
    const responseDe = await server.inject(
      "/editor/tools/locales/de/translation.json"
    );
    expect(responseDe.result.tool1).to.be.equal("tool1_de");
    expect(responseDe.result.tool2).to.be.undefined();

    const responseEn = await server.inject(
      "/editor/tools/locales/en/translation.json"
    );
    expect(responseEn.result.tool1).to.be.equal("tool1_en");

    const responseInexistingLanguage = await server.inject(
      "/editor/locales/inexistingLanguage/translation.json"
    );
    expect(responseInexistingLanguage.result.tool1).to.be.undefined();
  });

  it("returns the tool editor configs", async () => {
    const response = await server.inject("/editor/tools");
    expect(response.result[0].name).to.be.equal("tool1");
    expect(response.result[0].icon).to.be.equal(
      '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 31h32v1H0zM25 0h6v30h-6zm-8 6h6v24h-6zm-8 7h6v17H9zm-8 5h6v12H1z" fill-rule="evenodd"/></svg>'
    );
    expect(response.result[1].name).to.be.equal("tool2");
    expect(response.result[1].icon).to.be.equal(
      '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M0 31h32v1H0zM25 0h6v30h-6zm-8 6h6v24h-6zm-8 7h6v17H9zm-8 5h6v12H1z" fill-rule="evenodd"/></svg>'
    );
  });

  it("returns the target configs in the correct format (as an array of targets)", async () => {
    const response = await server.inject("/editor/targets");
    expect(response.result).to.be.an.array();
    expect(response.result[0].key).to.be.equal("pub1");
  });
});

lab.experiment("core schema endpoints", () => {
  it("returns the tool schema", async () => {
    const response = await server.inject("/tools/tool1/schema.json");
    expect(response.statusCode).to.be.equal(200);
    expect(response.result).to.be.an.object();
    expect(response.result.properties.foo.type).to.be.equal("string");
  });

  it("returns 400 for the tool schema with appendItemToPayload query parameter", async () => {
    const response = await server.inject(
      "/tools/tool1/schema.json?appendItemToPayload=mock-item-active"
    );
    expect(response.statusCode).to.be.equal(400);
  });

  it("returns the tool display options schema", async () => {
    const response = await server.inject(
      "/tools/tool1/display-options-schema.json"
    );
    expect(response.statusCode).to.be.equal(200);
    expect(response.result).to.be.an.object();
    expect(response.result.properties.foo.type).to.be.equal("boolean");
  });

  it("return 404 for a tool not having any display options", async () => {
    const response = await server.inject(
      "/tools/tool2/display-options-schema.json"
    );
    expect(response.statusCode).to.be.equal(404);
  });

  it("returns the tool display options schema with appendItemToPayload query parameter", async () => {
    const response = await server.inject(
      "/tools/tool1/display-options-schema.json?appendItemToPayload=mock-item-active"
    );
    expect(response.statusCode).to.be.equal(200);
    expect(response.result).to.be.an.object();
    expect(response.result.properties.hideTitle.type).to.be.equal("boolean");
  });

  it("returns 400 if the item tool in appendItemToPayload is not from the specified tool", async () => {
    const response = await server.inject(
      "/tools/tool2/display-options-schema.json?appendItemToPayload=mock-item-active"
    );
    expect(response.statusCode).to.be.equal(400);
  });
});

lab.experiment("screenshot plugin", async () => {
  it(
    "returns a screenshot with correct cache-control headers with wait as number",
    { timeout: 5000, plan: 3 },
    async () => {
      const response = await server.inject(
        "/screenshot/mock-item-active.png?target=pub1&width=500&wait=200"
      );
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["content-type"]).to.be.equal("image/png");
      expect(response.headers["cache-control"]).to.be.equal(
        "public,max-age=1,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
    }
  );

  it(
    "returns a screenshot with correct cache-control headers with wait as selector",
    { timeout: 5000, plan: 3 },
    async () => {
      const response = await server.inject(
        "/screenshot/mock-item-active.png?target=pub1&width=500&wait=h1"
      );
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["content-type"]).to.be.equal("image/png");
      expect(response.headers["cache-control"]).to.be.equal(
        "public,max-age=1,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
    }
  );

  it(
    "returns a screenshot with correct cache-control headers without wait",
    { timeout: 5000, plan: 3 },
    async () => {
      const response = await server.inject(
        "/screenshot/mock-item-active.png?target=pub1&width=500"
      );
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["content-type"]).to.be.equal("image/png");
      expect(response.headers["cache-control"]).to.be.equal(
        "public,max-age=1,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
    }
  );

  it(
    "returns a screenshot with correct cache-control headers without wait for POST request",
    { timeout: 5000, plan: 3 },
    async () => {
      const itemResponse = await server.inject("/item/mock-item-active");
      const item = itemResponse.result;
      const response = await server.inject({
        method: "POST",
        url: "/screenshot.png?target=pub1&width=500",
        payload: {
          item: item
        }
      });
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["content-type"]).to.be.equal("image/png");
      expect(response.headers["cache-control"]).to.be.equal(
        "public,max-age=1,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
    }
  );

  it(
    "returns the screenshot info with correct cache-control headers without wait",
    { timeout: 5000, plan: 5 },
    async () => {
      const response = await server.inject(
        "/screenshot/mock-item-active.json?target=pub1&width=500"
      );
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["content-type"]).to.be.equal(
        "application/json; charset=utf-8"
      );
      expect(response.headers["cache-control"]).to.be.equal(
        "public,max-age=1,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
      expect(response.result.width).to.be.equal(500);
      expect(response.result.height).to.be.equal(99);
    }
  );

  it(
    "returns the screenshot info with correct cache-control headers for POST request",
    { timeout: 5000, plan: 5 },
    async () => {
      const itemResponse = await server.inject("/item/mock-item-active");
      const item = itemResponse.result;
      const response = await server.inject({
        method: "POST",
        url: "/screenshot.json?target=pub1&width=500",
        payload: {
          item: item
        }
      });
      expect(response.statusCode).to.be.equal(200);
      expect(response.headers["content-type"]).to.be.equal(
        "application/json; charset=utf-8"
      );
      expect(response.headers["cache-control"]).to.be.equal(
        "public,max-age=1,s-maxage=1,stale-while-revalidate=1,stale-if-error=1"
      );
      expect(response.result.width).to.be.equal(500);
      expect(response.result.height).to.be.equal(99);
    }
  );
});

lab.experiment("fixture data plugin", () => {
  it("returns no existing fixture data id", async () => {
    const response = await server.inject("/fixtures/data");
    expect(response.statusCode).to.be.equal(200);
    expect(response.result.length).to.be.equal(0);
  });
  it("returns one saved fixture data item for tool1", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/fixtures/data",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass" }
      }
    });
    expect(response.statusCode).to.be.equal(200);
    expect(response.result.saved.length).to.be.equal(1);
    expect(response.result.saved[0]).to.be.equal("tool1-0");
  });
  it("returns one existing fixture data id", async () => {
    const response = await server.inject("/fixtures/data");
    expect(response.statusCode).to.be.equal(200);
    expect(response.result.length).to.be.equal(1);
    expect(response.result[0]._id).to.be.equal("tool1-0");
  });
});

lab.experiment("keycdn plugin", () => {
  it("returns with cache-tag header if there is an id in the route params and request is from keycdn", async () => {
    const response = await server.inject({
      method: "GET",
      headers: {
        "x-pull": "KeyCDN"
      },
      url: "/rendering-info/mock-item-active/pub1"
    });
    expect(response.headers["cache-tag"]).to.be.equal(
      "q-item-id-mock-item-active"
    );
  });

  it("returns no cache-tag header if there is an id in the route params and request is not from keycdn", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/rendering-info/mock-item-active/pub1"
    });
    expect(response.headers["cache-tag"]).to.be.undefined();
  });

  it("returns no cache-tag header if there is no id in the route params and request is from keycdn", async () => {
    const response = await server.inject({
      method: "GET",
      headers: {
        "x-pull": "KeyCDN"
      },
      url: "/tools/tool1/display-options-schema.json"
    });
    expect(response.headers["cache-tag"]).to.be.undefined();
  });

  it("returns no cache-tag header if there is an id in the route params and request is from keycdn but cache-control is no-cache", async () => {
    const response = await server.inject({
      method: "GET",
      headers: {
        "x-pull": "KeyCDN"
      },
      url: "/rendering-info/mock-item-active/pub1?noCache=true"
    });
    expect(response.headers["cache-tag"]).to.be.undefined();
  });
});

lab.experiment("tasks plugin", () => {
  it("returns the configured tasks by checking the roles when user doesn't have all the roles", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/tasks",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass" }
      }
    });
    expect(response.result.tasks.length).to.be.equal(1);
    expect(response.result.tasks[0].id).to.be.equal("testTask");
  });
  it("returns the configured tasks by checking the roles when user has all the roles needed for the tasks", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/tasks",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass", roles: ["admin"] }
      }
    });
    expect(response.result.tasks.length).to.be.equal(2);
    expect(response.result.tasks[0].id).to.be.equal("testTask");
    expect(response.result.tasks[1].id).to.be.equal("adminTask");
  });
  it("returns the response from a configured task", async () => {
    const taskInput = "test input";
    const payload = {
      someTaskInput: taskInput
    };
    const response = await server.inject({
      method: "POST",
      url: "/tasks/test",
      auth: {
        strategy: "q-auth",
        credentials: { username: "user", password: "pass" }
      },
      payload: payload
    });
    expect(response.result.type).to.be.equal("json");
    expect(JSON.stringify(response.result.data.content)).to.be.equal(
      JSON.stringify(payload)
    );
  });
});
