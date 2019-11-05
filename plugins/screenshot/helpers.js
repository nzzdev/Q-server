const puppeteer = require("puppeteer");
const fetch = require("node-fetch");

// start a chromium process here
let browserPromise = puppeteer.launch({
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none"
  ]
});

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
          "User-Agent": userAgent
        }
      }).then(response => {
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
  config
) {
  let browser = await browserPromise;

  let page;

  // try to open the page, if it doesn't work, launch a new browser
  try {
    page = await browser.newPage();
  } catch (err) {
    browserPromise = puppeteer.launch({ args: ["--no-sandbox"] });
    browser = await browserPromise;
    page = await browser.newPage();
  }

  // the height of 16384 is the max height of a GL context in chromium or something
  await page.setViewport({
    width: config.width,
    height: 16384,
    deviceScaleFactor: config.dpr
  });

  await page.goto(emptyPageUrl);

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
    waitUntil: "load"
  });

  const scriptContent = await getConcatenatedAssets(scripts, userAgent);
  await page.mainFrame().addScriptTag({
    content: scriptContent
  });

  // wait for the next idle callback (to have most probably finished all work)
  await page.evaluate(`() => {
    return new Promise((resolve, reject) => {
      requestIdleCallback(resolve);
    });
  }`);

  // we support a wait parameter, this can be either a number or a css selector to wait for
  if (config.waitBeforeScreenshot) {
    await page.waitFor(config.waitBeforeScreenshot);
  }

  return page;
}

async function getScreenshotImage(
  emptyPageUrl,
  markup,
  scripts,
  stylesheets,
  config
) {
  let isTransparent = false;
  if (!config.background || config.background === "none") {
    isTransparent = true;
  }

  const page = await getFinishedPage(
    emptyPageUrl,
    markup,
    scripts,
    stylesheets,
    config
  );

  const graphicElement = await page.$("#q-screenshot-service-container");

  const imageBuffer = await graphicElement.screenshot({
    omitBackground: isTransparent
  });

  await page.close();

  return imageBuffer;
}

async function getScreenshotInfo(
  emptyPageUrl,
  markup,
  scripts,
  stylesheets,
  config
) {
  const page = await getFinishedPage(
    emptyPageUrl,
    markup,
    scripts,
    stylesheets,
    config
  );

  const graphicElement = await page.$("#q-screenshot-service-container");
  const bbox = await graphicElement.boundingBox();

  return {
    width: bbox.width,
    height: bbox.height
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
      .map(paddingPos => {
        return paddingPos.match(
          new RegExp(/^$|^(([0-9.]+)(px|em|ex|%|in|cm|mm|pt|pc|vh|vw)?([ ])?)$/)
        );
      })
      .filter(match => {
        return Array.isArray(match);
      })
      .map(match => {
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
  getInnerWidth: getInnerWidth
};
