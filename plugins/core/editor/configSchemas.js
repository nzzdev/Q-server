const Joi = require("../../../helper/custom-joi.js");

const target = Joi.object().pattern(
  Joi.string(), // the key needs to be a string
  Joi.object().keys({
    label: Joi.string().required(),
    type: Joi.string()
      .required()
      .valid("web", "AMP", "image", "application/json", "application/pdf"),
    context: Joi.object().keys({
      stylesheets: Joi.array().items(
        Joi.object().keys({ url: Joi.string().uri() })
      ),
      background: Joi.object().keys({
        background: Joi.string()
      })
    }),
    additionalRenderingInfo: Joi.object()
  })
);

module.exports = {
  target
};
