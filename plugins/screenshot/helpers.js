const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// start a chromium process here
let browserPromise = puppeteer.launch({ args: ['--no-sandbox'] });

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
            'User-Agent': userAgent
          }
        })
        .then(response => {
          if (response.ok) {
            return response.text();
          } else {
            return '';
          }
        });
      contentPromises.push(promise);
    }
  }
  const contents = await Promise.all(contentPromises);
  return contents
    .join('\n');
}

async function getScreenshot(emptyPageUrl, markup, scripts, stylesheets, config) {
  let browser = await browserPromise;

  let page;

  // try to open the page, if it doesn't work, launch a new browser
  try {
    page = await browser.newPage();
  } catch (err) {
    browserPromise = puppeteer.launch({ args: ['--no-sandbox'] });
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
  const userAgent = await page.evaluate('navigator.userAgent');

  const styleContent = await getConcatenatedAssets(stylesheets, userAgent);
  
  let bodyStyle = 'margin: 0; padding: 0;';
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
        <div id="q-screenshot-service-container" style="padding: ${config.padding}";>${markup}</div>
      </body>
    </html>`;
  
  await page.setContent(content, {
    waitUntil: 'load'
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

  const graphicElement = await page.$('#q-screenshot-service-container');

  let isTransparent = false;
  if (!config.background || config.background === 'none') {
    isTransparent = true;
  }

  const imageBuffer = await graphicElement.screenshot({
    omitBackground: isTransparent
  });

  await page.close();
  
  return imageBuffer;
}

module.exports = {
  getScreenshot: getScreenshot
}
