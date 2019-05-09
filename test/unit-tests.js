const Lab = require("@hapi/lab");
const Code = require("@hapi/code");
const lab = (exports.lab = Lab.script());

const clone = require("clone");

const expect = Code.expect;
const before = lab.before;
const after = lab.after;
const it = lab.it;

const items = require("./mock/items.js");
const plugins = require("./plugins.js");
let server = require("./server.js").getServer();

before(async () => {
  try {
    await server.register(plugins);
    await server.start();
  } catch (err) {
    expect(err).to.not.exist();
  }
});

after(async () => {
  await server.stop({ timeout: 2000 });
  server = null;
});

lab.experiment("meta-properties", () => {
  const deleteMetaProperties = require("../helper/meta-properties")
    .deleteMetaProperties;
  it("strips meta properties", () => {
    let slimItem = deleteMetaProperties(clone(items[0]));
    expect(slimItem.editedBy).to.be.undefined();
    expect(slimItem.createdBy).to.be.undefined();
    expect(slimItem.department).to.be.undefined();
  });

  it("should only delete all meta properties", function() {
    let slimItem = deleteMetaProperties(clone(items[0]));
    expect(slimItem.data).to.not.be.undefined();
  });
});

lab.experiment("server.method: getCacheControlDirectivesFromConfig", () => {
  it("returns Cache-Control: public if no config given", async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig();
    expect(configCacheControl[0]).to.be.equal("no-cache");
  });

  it("returns correct cache control header if maxAge given", async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig(
      {
        public: true,
        maxAge: 1
      }
    );
    expect(configCacheControl[0]).to.be.equal("public");
    expect(configCacheControl[1]).to.be.equal("max-age=1");
  });

  it("returns correct cache control header if sMaxAge given", async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig(
      {
        sMaxAge: 1
      }
    );
    expect(configCacheControl[0]).to.be.equal("s-maxage=1");
  });

  it("returns correct cache control header if staleWhileRevalidate given", async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig(
      {
        public: true,
        staleWhileRevalidate: 1
      }
    );
    expect(configCacheControl[0]).to.be.equal("public");
    expect(configCacheControl[1]).to.be.equal("stale-while-revalidate=1");
  });

  it("returns correct cache control header if staleIfError given", async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig(
      {
        public: true,
        staleIfError: 1
      }
    );
    expect(configCacheControl[0]).to.be.equal("public");
    expect(configCacheControl[1]).to.be.equal("stale-if-error=1");
  });

  it("computes correct cache control headers if all config given", async () => {
    const configCacheControl = await server.methods.getCacheControlDirectivesFromConfig(
      require("./config/base.js").get("/cache/cacheControl")
    );
    expect(configCacheControl[0]).to.be.equal("public");
    expect(configCacheControl[1]).to.be.equal("max-age=1");
    expect(configCacheControl[2]).to.be.equal("s-maxage=1");
    expect(configCacheControl[3]).to.be.equal("stale-while-revalidate=1");
    expect(configCacheControl[4]).to.be.equal("stale-if-error=1");
  });
});

lab.experiment("rendering-info toolRuntimeConfig", () => {
  it("constructs correct default toolBaseUrl if no path given", async () => {
    const getCompiledToolRuntimeConfig = require("../plugins/core/rendering-info/helpers.js")
      .getCompiledToolRuntimeConfig;
    const toolRuntimeConfig = getCompiledToolRuntimeConfig(clone(items[0]), {
      serverWideToolRuntimeConfig: {
        toolBaseUrl: {
          protocol: "https",
          host: "q-server-host"
        }
      }
    });

    expect(toolRuntimeConfig.toolBaseUrl).to.be.equal(
      "https://q-server-host/tools/tool1"
    );
  });

  it("constructs correct toolBaseUrl if path given", async () => {
    const getCompiledToolRuntimeConfig = require("../plugins/core/rendering-info/helpers.js")
      .getCompiledToolRuntimeConfig;
    const toolRuntimeConfig = getCompiledToolRuntimeConfig(clone(items[0]), {
      serverWideToolRuntimeConfig: {
        toolBaseUrl: {
          protocol: "https",
          host: "q-server-host",
          path: "/some-other/path"
        }
      }
    });
    expect(toolRuntimeConfig.toolBaseUrl).to.be.equal(
      "https://q-server-host/some-other/path"
    );
  });

  it("applies toolEndpointConfig if given", async () => {
    const getCompiledToolRuntimeConfig = require("../plugins/core/rendering-info/helpers.js")
      .getCompiledToolRuntimeConfig;
    const toolRuntimeConfig = getCompiledToolRuntimeConfig(clone(items[0]), {
      serverWideToolRuntimeConfig: {
        foo: "server"
      },
      toolEndpointConfig: {
        toolRuntimeConfig: {
          foo: "toolendpoint"
        }
      }
    });
    expect(toolRuntimeConfig.foo).to.be.equal("toolendpoint");
  });

  it(
    "applies toolEndpointConfig and requestToolRuntimeConfig if given",
    { plan: 2 },
    async () => {
      const getCompiledToolRuntimeConfig = require("../plugins/core/rendering-info/helpers.js")
        .getCompiledToolRuntimeConfig;
      const toolRuntimeConfig = getCompiledToolRuntimeConfig(clone(items[0]), {
        serverWideToolRuntimeConfig: {
          foo: "server"
        },
        toolEndpointConfig: {
          toolRuntimeConfig: {
            foo: "toolendpoint",
            bar: "toolendpoint"
          }
        },
        requestToolRuntimeConfig: {
          bar: "request"
        }
      });
      expect(toolRuntimeConfig.foo).to.be.equal("toolendpoint");
      expect(toolRuntimeConfig.bar).to.be.equal("request");
    }
  );

  it("fails to validate invalid size object", { plan: 10 }, async () => {
    const validateSize = require("../plugins/core/rendering-info/size-helpers.js")
      .validateSize;
    try {
      validateSize({
        width: [
          {
            value: 500,
            comparison: ">"
          },
          {
            value: 400,
            comparison: "<"
          }
        ]
      });
    } catch (err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.be.equal(
        "The combination of values and comparison signs does not result in a meaningful range."
      );
    }

    try {
      validateSize({
        width: [
          {
            value: 100,
            comparison: "="
          },
          {
            value: 200,
            comparison: "<"
          }
        ]
      });
    } catch (err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.be.equal(
        "The combination of values and comparison signs does not result in a meaningful range."
      );
    }

    try {
      validateSize({
        width: [
          {
            value: 100,
            comparison: ">"
          },
          {
            value: 200,
            comparison: "="
          }
        ]
      });
    } catch (err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.be.equal(
        "The combination of values and comparison signs does not result in a meaningful range."
      );
    }

    try {
      validateSize({
        width: [
          {
            value: 200,
            comparison: ">",
            unit: "px"
          },
          {
            value: 300,
            comparison: "<",
            unit: "cm"
          }
        ]
      });
    } catch (err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.be.equal(
        "Units are not the same for the given range."
      );
    }

    try {
      validateSize({
        width: [
          {
            value: 200,
            comparison: ">"
          },
          {
            value: 300,
            comparison: ">"
          }
        ]
      });
    } catch (err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.be.equal(
        "The combination of values and comparison signs does not result in a meaningful range."
      );
    }
  });

  it("validates valid size object", { plan: 2 }, async () => {
    const validateSize = require("../plugins/core/rendering-info/size-helpers.js")
      .validateSize;
    let error;
    try {
      validateSize({
        width: [
          {
            value: 500,
            comparison: ">"
          },
          {
            value: 800,
            comparison: "<"
          }
        ]
      });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.undefined();

    error = undefined;
    try {
      validateSize({
        width: [
          {
            value: 200,
            comparison: "="
          }
        ]
      });
    } catch (err) {
      error = err;
    }
    expect(error).to.be.undefined();
  });
});
