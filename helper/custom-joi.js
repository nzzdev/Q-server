const Bourne = require("@hapi/bourne");
const Joi = require("@hapi/joi");

// As of Joi v16, strings are no longer automatically converted to objects/arrays,
// even if the convert option of any.validate() is "true" (which is the default).
// => A string such as '{"foo": "bar"}' is not valid for Joi.object().
//    And '["foo", "bar"]' is not valid for Joi.array().
// This is a problem when passing objects/arrays in HTTP query strings, where they
// can only be represented as strings. This custom extension allows converting
// objects/arrays to strings as it was done in Joi v15 and before.
// Adapted from https://github.com/hapijs/joi/issues/2037
// (section "Array and object string coercion")
module.exports = Joi.extend(
  {
    type: "object",
    base: Joi.object(),
    coerce: {
      from: "string",
      method(value) {
        if (value[0] !== "{" && !/^\s*\{/.test(value)) {
          return;
        }

        try {
          return { value: Bourne.parse(value) };
        } catch (ignoreErr) {}
      }
    }
  },
  {
    type: "array",
    base: Joi.array(),
    coerce: {
      from: "string",
      method(value) {
        if (
          typeof value !== "string" ||
          (value[0] !== "[" && !/^\s*\[/.test(value))
        ) {
          return;
        }

        try {
          return { value: Bourne.parse(value) };
        } catch (ignoreErr) {}
      }
    }
  }
);
