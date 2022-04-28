const Joi = require("../../helper/custom-joi.js");
const querystring = require("querystring");
const imageSize = require("image-size");

function InchToMM(inch) {
  return Math.round(inch * 25.4 * 10) / 10;
}

module.exports = {
  method: "POST",
  path: "/print/rendering-info-preview",
  options: {
    validate: {
      options: {
        allowUnknown: true
      },
      payload: {
        item: Joi.object().required(),
        toolRuntimeConfig: Joi.object().required()
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
    const screenshotResponse = await request.server.inject({
      url: `/print/rendering-info.png?${querystring.encode(request.query)}`,
      method: "POST",
      payload: request.payload
    });

    let sizeInfo = {
      width: undefined,
      height: undefined
    };

    try {
      const size = imageSize(screenshotResponse.rawPayload);
      const dpi = request.payload.toolRuntimeConfig.dpi || 300;

      sizeInfo = {
        width: `${InchToMM(size.width / dpi)}mm`,
        height: `${InchToMM(size.height / dpi)}mm`
      };
    } catch (e) {
      sizeInfo = "Information kann nicht angezeigt werden";
    }

    const renderingInfo = {
      markup: `<div style="color: black; padding-bottom: 20px;">Grösse: ${sizeInfo.width} x ${sizeInfo.height}</div>`
    };

    if (screenshotResponse.statusCode === 200) {
      renderingInfo.markup += `<img style="width: ${sizeInfo.width ||
        "50%"}; max-width: 100%; display: block;" src="data:image/png;base64,${screenshotResponse.rawPayload.toString(
        "base64"
      )}">`;
    } else {
      renderingInfo.markup += `<div style="color: black;">Die Vorschau kann nicht angezeigt werden. Fehler: <pre>${screenshotResponse.payload}</pre></div>`;
    }

    return renderingInfo;
  }
};
