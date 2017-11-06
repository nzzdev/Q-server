const Joi = require('joi');
const Boom = require('boom');

// size, width and height are optional 
// if a width or height array is defined the following restrictions apply:
// the array consists of either one (equality or one-sided limitation) or two objects (for a range)
// the respective object has to have a value and a comparison sign, 
// if no unit is defined the default value 'px' is assumed. 
const sizeValidationObject = {
  width: Joi.array().items(Joi.object({
    value: Joi.number().required(),
    comparison: Joi.string().regex(/^(<|>|=){1}$/).required(),
    unit: Joi.string().regex(/^(px|mm)?$/).optional()
  }).required()).max(2).optional(), 
  height: Joi.array().items(Joi.object({
    value: Joi.number().required(),
    comparison: Joi.string().regex(/^(<|>|=){1}$/).required(),
    unit: Joi.string().optional()
  })).max(2).optional() 
};


function validateDimension(dimension) {
  if (dimension.length === 2) {
    let dimensionA = dimension[0];
    let dimensionB = dimension[1];
    if (dimensionA.unit === undefined) {
      dimensionA.unit = 'px';
    }
    if (dimensionB.unit === undefined) {
      dimensionB.unit = 'px'
    }
    if (dimensionA.unit !== dimensionB.unit) {
      throw Boom.badData('Units are not the same for the given range.');
    }
    let comparisonA = dimensionA.comparison;
    let comparisonB = dimensionB.comparison;
    if (comparisonA === comparisonB || comparisonA === '=' || comparisonB === '=' 
        || (comparisonA === '<' && dimensionA.value < dimensionB.value)
        || (comparisonB === '>' && dimensionB.value > dimensionA.value)) {
      throw Boom.badData('The combination of values and comparison signs does not result in a meaningful range.')
    }
  }
  return true;
}

function validateSize(size) {
  if (size.width) {
    try {
      validateDimension(size.width);
    } catch (err) {
      throw err;
    }
  }
  if (size.height) {
    try {
      validateDimension(size.height);
    } catch (err) {
      throw err;
    }
  }
}

module.exports = {
  sizeValidationObject: sizeValidationObject,
  validateDimension: validateDimension,
  validateSize: validateSize
}