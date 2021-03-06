const Joi = require("../../../helper/custom-joi.js");

const target = Joi.object().pattern(
  Joi.string(), // the key needs to be a string
  Joi.object().keys({
    label: Joi.string().required(),
    type: Joi.string()
      .required()
      .valid("web", "AMP", "image", "application/json", "application/pdf"),
    additionalRenderingInfo: Joi.object().when("type", {
      is: Joi.string()
        .required()
        .valid("web", "json"),
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }),
    processRenderingInfo: Joi.optional().allow(
      Joi.func().arity(1),
      Joi.array().items(Joi.func().arity(1))
    )
  })
);

const toolEndpoint = Joi.alternatives().try(
  Joi.object()
    .keys({
      path: Joi.string().optional(),
      url: Joi.string().optional(),
      additionalRenderingInfo: Joi.object().optional(),
      toolRuntimeConfig: Joi.object().optional(),
      processRenderingInfo: Joi.optional().allow(
        Joi.func().arity(1),
        Joi.array().items(Joi.func().arity(1))
      )
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
