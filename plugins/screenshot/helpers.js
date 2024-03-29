const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const PCR = require("puppeteer-chromium-resolver");
let isFirstTime = true;

// start a chromium process here
let browserPromise = startPcrChromiumProcess();

async function startPcrChromiumProcess() {
  const option = {
    revision: "",
    detectionPath: "",
    folderName: ".chromium-browser-snapshots",
    defaultHosts: [
      "https://storage.googleapis.com",
      "https://npm.taobao.org/mirrors",
    ],
    hosts: [],
    cacheRevisions: 2,
    retry: 3,
    silent: false,
  };
  const stats = await PCR(option);

  return stats.puppeteer
    .launch({
      timeout: 120000, // Reduce chances for timeouts
      headless: true, // Not needed with xvfb
      args: [
        "--single-process", // Reduce chances for timeouts
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
      executablePath: stats.executablePath,
      devtools: true,
    })
    .catch(function (error) {
      Boom.internal(error.message);
    });
}

// fetches assets and returns a concatenated string containing everything fetched
async function getConcatenatedAssets(assets, userAgent) {
  const contentPromises = [];
  for (let asset of assets) {
    if (asset.content) {
      contentPromises.push(Promise.resolve(asset.content));
    }
    if (asset.url) {
      const promise = fetch(asset.url, {
        headers: {
          "User-Agent": userAgent,
        },
      }).then((response) => {
        if (response.ok) {
          return response.text();
        } else {
          return "";
        }
      });
      contentPromises.push(promise);
    }
  }
  const contents = await Promise.all(contentPromises);
  return contents.join("\n");
}

async function getFinishedPage(
  emptyPageUrl,
  markup,
  scripts,
  stylesheets,
  config,
  server
) {
  let browser = await browserPromise;

  let page;

  // try to open the page, if it doesn't work, launch a new browser
  try {
    page = await browser.newPage();
  } catch (err) {
    if (err.stack) {
      server.log(["error"], err.stack);
    }
    if (err.isBoom) {
      throw err;
    } else {
      server.log(["error"], err.message);
    }

    browserPromise = startPcrChromiumProcess();
    browser = await browserPromise;
    page = await browser.newPage();
  }

  try {
    // the height of 16384 is the max height of a GL context in chromium or something
    await page.setViewport({
      width: config.width,
      height: 16384,
      deviceScaleFactor: config.dpr,
    });

    // Log the console messages of chromium
    page.on("console", (msg) => {
      console.log(msg);
    });

    // Log the GPU information of chromium
    if (isFirstTime) {
      await page
        .goto("chrome://gpu", {
          waitUntil: "networkidle0",
          timeout: 20 * 60 * 1000,
        })
        .catch((e) => console.log(e));

      const content = await page.content();
      console.log(content);
      server.log(["info"], content);

      isFirstTime = false;
    }

    await page.goto(emptyPageUrl);
  } catch (err) {
    if (err.stack) {
      server.log(["error"], err.stack);
    }
    if (err.isBoom) {
      throw err;
    } else {
      server.log(["error"], err.message);
    }

    throw err;
  }

  // use strings instead of functions here as it will break in the tests otherwise.
  const userAgent = await page.evaluate("navigator.userAgent");

  const styleContent = await getConcatenatedAssets(stylesheets, userAgent);

  let bodyStyle = "margin: 0; padding: 0;";
  if (config.background) {
    bodyStyle += `background: ${config.background}`;
  }

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>${styleContent}</style>
      </head>
      <body style="${bodyStyle}">
        <div id="q-screenshot-service-container"
             style="padding: ${config.padding}; width: ${config.width}px;">
          ${markup}
        </div>
      </body>
    </html>`;

  await page.setContent(content, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });

  const scriptContent = await getConcatenatedAssets(scripts, userAgent);

  if (scriptContent) {
    await page.mainFrame().addScriptTag({
      content: scriptContent,
    });
  }

  // Temporary fix - in the long run we need a solution for all Q tools
  if (config.qTool === "locator_map") {
    let retry = 0;

    const qId = `_q_locator_map${config.qId}`;

    while (retry < 2) {
      try {
        if (retry === 1) {
          await page.reload({
            waitUntil: ["domcontentloaded", "networkidle0"],
          });
        }

        await page.waitForFunction(
          (qId) => window[qId]?.isLoaded === true,
          {
            timeout: 20000,
          },
          qId
        );

        return page;
      } catch (err) {
        if (err.name === "TimeoutError") {
          retry++;
          if (retry >= 2) {
            throw err;
          }
        } else if (err.stack) {
          server.log(["error"], err.stack);
        } else if (err.isBoom) {
          throw err;
        } else {
          server.log(["error"], err.message);
        }
      }
    }
  }

  // wait for the next idle callback (to have most probably finished all work)
  await page.evaluate(`() => {
    return new Promise((resolve, reject) => {
      requestIdleCallback(resolve);
    });
  }`);

  // we support a wait parameter, this is a number in milliseconds to wait for
  if (config.waitBeforeScreenshot) {
    await page.waitForTimeout(config.waitBeforeScreenshot);
  }

  return page;
}

async function getScreenshotImage(
  emptyPageUrl,
  markup,
  scripts,
  stylesheets,
  config,
  server
) {
  let isTransparent = false;
  if (!config.background || config.background === "none") {
    isTransparent = true;
  }

  let imageBuffer;

  try {
    const page = await getFinishedPage(
      emptyPageUrl,
      markup,
      scripts,
      stylesheets,
      config,
      server
    );

    const graphicElement = await page.$("#q-screenshot-service-container");

    imageBuffer = await graphicElement.screenshot({
      omitBackground: isTransparent,
    });

    await page.close();
  } catch (err) {
    if (err.stack) {
      server.log(["error"], err.stack);
    }
    if (err.isBoom) {
      throw err;
    } else {
      server.log(["error"], err.message);
    }

    throw err;
  }

  return imageBuffer;
}

async function getScreenshotInfo(
  emptyPageUrl,
  markup,
  scripts,
  stylesheets,
  config,
  server
) {
  const page = await getFinishedPage(
    emptyPageUrl,
    markup,
    scripts,
    stylesheets,
    config,
    server
  );

  const graphicElement = await page.$("#q-screenshot-service-container");
  const bbox = await graphicElement.boundingBox();

  return {
    width: bbox.width,
    height: bbox.height,
  };
}

function getInnerWidth(width, padding) {
  if (!width) {
    return null;
  }
  // if padding is given, we need to know if it's in pixel to calculate with the width
  if (padding !== undefined) {
    // split the padding by space
    const units = padding
      .split(" ")
      .map((paddingPos) => {
        return paddingPos.match(
          new RegExp(/^$|^(([0-9.]+)(px|em|ex|%|in|cm|mm|pt|pc|vh|vw)?([ ])?)$/)
        );
      })
      .filter((match) => {
        return Array.isArray(match);
      })
      .map((match) => {
        if (match[3] === undefined) {
          // if no unit given, px is default
          return "px";
        }
        return match[3]; // the original unit or px if it was undefined before
      })
      .reduce((units, unit) => {
        // unique
        if (!units.includes(unit)) {
          units.push(unit);
        }
        return units;
      }, []);

    // if we have only pixels, we can move on
    if (units.length === 1 && units[0] === "px") {
      const paddingPos = padding.split(" ");
      if (paddingPos.length === 1) {
        // if there is one padding, this is for left and right, the regex separates the number and the unit
        const pixelNumber = paddingPos[0].match(
          new RegExp(/^$|^(([0-9.]+)(.*)?)$/)
        )[2];
        width = width - 2 * pixelNumber;
      }
      if (paddingPos.length === 2 || paddingPos.length === 3) {
        // for 2 or 3 paddings, we take the second one, as this is left and right padding
        const pixelNumber = paddingPos[1].match(
          new RegExp(/^$|^(([0-9.]+)(.*)?)$/)
        )[2];
        width = width - 2 * pixelNumber;
      }
      if (paddingPos.length === 4) {
        // if we have 4 paddings, the 2nd and 4th are left and right
        const pixelNumberLeft = paddingPos[1].match(
          new RegExp(/^$|^(([0-9.]+)(.*)?)$/)
        )[2];
        const pixelNumberRight = paddingPos[3].match(
          new RegExp(/^$|^(([0-9.]+)(.*)?)$/)
        )[2];
        width = width - pixelNumberLeft - pixelNumberRight;
      }
    }
  }

  return width;
}

module.exports = {
  getScreenshotImage: getScreenshotImage,
  getScreenshotInfo: getScreenshotInfo,
  getInnerWidth: getInnerWidth,
};
