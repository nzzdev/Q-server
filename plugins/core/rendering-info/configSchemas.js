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

const toolEndpoint = Joi.alternatives().try(
  Joi.object()
    .keys({
      path: Joi.string().optional(),
      url: Joi.string().optional(),
      additionalRenderingInfo: Joi.object().optional(),
      toolRuntimeConfig: Joi.object().optional()
    })
    .without("path", ["url"])
    .without("url", ["path"]),
  Joi.boolean().falsy(),
  Joi.func().arity(2)
);

module.exports = {
  target,
  toolEndpoint
};
