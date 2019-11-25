"use strict";

const FloatN = require('./floatn');

module.exports = {
  id: 0x3B,
  type: 'FLT4',
  name: 'Real',
  declaration: function declaration() {
    return 'real';
  },
  writeTypeInfo: function writeTypeInfo(buffer) {
    buffer.writeUInt8(FloatN.id);
    buffer.writeUInt8(4);
  },
  writeParameterData: function writeParameterData(buffer, parameter, options, cb) {
    if (parameter.value != null) {
      buffer.writeUInt8(4);
      buffer.writeFloatLE(parseFloat(parameter.value));
    } else {
      buffer.writeUInt8(0);
    }

    cb();
  },
  validate: function validate(value) {
    if (value == null) {
      return null;
    }

    value = parseFloat(value);

    if (isNaN(value)) {
      return new TypeError('Invalid number.');
    }

    return value;
  }
};