const Joi = require("@hapi/joi");

const target = Joi.object().pattern(
  Joi.string(), // the key needs to be a string
  Joi.object().keys({
    label: Joi.string().required(),
    type: Joi.string()
      .required()
      .valid(["web", "AMP", "image", "application/json", "application/pdf"]),
    additionalRenderingInfo: Joi.object().when("type", {
      is: Joi.string()
        .required()
        .valid(["web", "json"]),
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  })
);

const toolEndpoint = Joi.object()
  .keys({
    path: Joi.string(),
    url: Joi.string(),
    additionalRenderingInfo: Joi.object(),
    toolRuntimeConfig: Joi.object()
  })
  .without("path", ["url"])
  .without("url", ["path"]);

module.exports = {
  target,
  toolEndpoint
};
