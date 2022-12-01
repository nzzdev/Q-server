const Joi = require("../../helper/custom-joi.js");
const Boom = require("@hapi/boom");
const querystring = require("querystring");
const fs = require("fs").promises;
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const crypto = require("crypto");

const {
  getCmykTiffBufferFromPng,
  promoteTiffBufferToBlack
} = require("./conversions.js");

// this seems to be the standard chrome points per pixel unit
const chromePPI = 96;

function mmToInch(mm) {
  return mm / 25.4;
}

module.exports = {
  method: "POST",
  path: "/print/rendering-info.{format}",
  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      params: {
        format: Joi.string().valid("png", "pdf", "tiff", "tif")
      },
      payload: {
        item: Joi.object().required(),
        toolRuntimeConfig: Joi.object()
          .required()
          .keys({
            displayOptions: Joi.object()
              .required()
              .keys({
                columns: Joi.number().required()
              })
          })
      },
      query: {
        _id: Joi.string().required()
      }
    },
    cache: {
      expiresIn: 1000 * 60 // 60 seconds
    },
    tags: ["api"]
  },
  handler: async function(request, h) {
    console.log('DISPLAYOPTIONS', request.payload.toolRuntimeConfig.displayOptions);

    try {
      const displayOptions = request.payload.toolRuntimeConfig.displayOptions;
      const screenshotRequestQuery = {};



      if (displayOptions && displayOptions.printTitle) {
        request.payload.item.title = displayOptions.printTitle;
      }

      if (displayOptions && displayOptions.printSubtitle) {
        request.payload.item.subtitle = displayOptions.printSubtitle;
      }

      if (displayOptions && displayOptions.printNotes) {
        request.payload.item.notes = displayOptions.printNotes;
      }

      screenshotRequestToolRuntimeConfig = JSON.parse(
        JSON.stringify(request.payload.toolRuntimeConfig)
      );



      // pass all the displayOptions to the tool
      // set hideTitle to true if the titleStyle is 'hide'
      screenshotRequestToolRuntimeConfig.displayOptions = Object.assign(
        displayOptions,
        {
          hideTitle: displayOptions.titleStyle === "hide"
        }
      );

      console.log('SCREENSHOT_REQUEST_TOOLRUNTIMECONFIG', screenshotRequestToolRuntimeConfig);

      const screenshotRequestPayload = {
        toolRuntimeConfig: screenshotRequestToolRuntimeConfig,
        item: request.payload.item
      };

      console.log('SCREENSHOT_REQUEST_PAYLOAD', screenshotRequestPayload);

      const dpi = request.payload.toolRuntimeConfig.dpi || 300;
      screenshotRequestQuery.dpr = dpi / chromePPI;

      console.log('dpi', dpi);
      console.log('chromePPI', chromePPI);

      // the screenshot width is the width in inch * target dpi
      const mm = await request.server.methods.plugins.q.print.colsToMm(displayOptions.columnsProfile, displayOptions.columns);

      console.log('mm', mm);

      screenshotRequestQuery.width = Math.round(
        (mmToInch(mm) * dpi) / screenshotRequestQuery.dpr
      );
      screenshotRequestQuery.background = screenshotRequestQuery.background || "white";
      screenshotRequestQuery.wait = request.payload.toolRuntimeConfig.wait || 2000;
      screenshotRequestQuery.target = await request.server.settings.app.print.target;

      console.log('SCREENSHOT_REQUEST_QUERY', screenshotRequestQuery);

      const screenshotImageResponse = await request.server.inject({
        method: "POST",
        url: `/screenshot.png?${querystring.stringify(screenshotRequestQuery)}`,
        payload: screenshotRequestPayload
      });

      console.log('SCREENSHOT_IMAGE_RESPONSE', screenshotImageResponse);

      // fail early if there is an error to generate the screenshot
      if (screenshotImageResponse.statusCode !== 200) {
        request.server.log(["error"], screenshotImageResponse.payload);
        return screenshotImageResponse;
      }

      if (request.params.format === "png") {
        return h.response(screenshotImageResponse.rawPayload).type("image/png");
      }

      return await new Promise(async (resolve, reject) => {
        const pngBuffer = screenshotImageResponse.rawPayload;
        const profiles = await request.server.settings.app.print.profiles;
        const tiffBuffer = await getCmykTiffBufferFromPng(pngBuffer, dpi, profiles);
        const finalTiffBuffer = await promoteTiffBufferToBlack(tiffBuffer);

        // if a TIFF is requested we return it here
        if (
          request.params.format === "tiff" ||
          request.params.format === "tif"
        ) {
          return resolve(finalTiffBuffer);
        }

        // if the format is not pdf here, we have a problem and return this
        if (request.params.format !== "pdf") {
          throw Boom.badRequest();
        }

        const requestId = crypto
          .createHash("sha1")
          .update(request.info.id)
          .digest("hex");

        console.log('requestId', requestId);

        // the following could all be optimised maybe by implementing it using streams and buffers
        // instead of writing and reading files
        // but we do it easy for now...
        const fileNameBase = `${__dirname}/${requestId}`;

        console.log('fileNameBase', fileNameBase);

        // write the tiff buffer to disk
        await fs.writeFile(`${fileNameBase}orig.tiff`, tiffBuffer);
        // remove the alpha channel for tiff2pdf to work
        const { stdoutA, stderrA } = await exec(
          `convert ${fileNameBase}orig.tiff -alpha off -compress lzw ${fileNameBase}-no-alpha.tiff`
        );

        console.log('stdoutA', stdoutA);
        console.log('stderrA', stderrA);

        // we need to use tiff2pdf instead of imagemagick since this produces pdf v1.3 compatible PDFs where imagemagick does not
        const { stdoutP, stderrP } = await exec(
          `tiff2pdf -z -o ${fileNameBase}.pdf ${fileNameBase}-no-alpha.tiff`
        );

        console.log('stdoutP', stdoutP);
        console.log('stderrP', stderrP);

        const pdfBuffer = await fs.readFile(`${fileNameBase}.pdf`);

        // console.log('pdfBuffer', pdfBuffer);

        resolve(h.response(pdfBuffer).type("application/pdf"));

        // remove all the intermediate files
        fs.unlink(`${fileNameBase}orig.tiff`);
        fs.unlink(`${fileNameBase}-no-alpha.tiff`);
        fs.unlink(`${fileNameBase}.pdf`);
      });
    } catch (e) {
      request.server.log(["error"], e);
      throw e;
    }
  }
};
