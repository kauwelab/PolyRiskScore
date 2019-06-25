"use strict";

const IntN = require('./intn');

module.exports = {
  id: 0x34,
  type: 'INT2',
  name: 'SmallInt',
  declaration: function declaration() {
    return 'smallint';
  },
  writeTypeInfo: function writeTypeInfo(buffer) {
    buffer.writeUInt8(IntN.id);
    buffer.writeUInt8(2);
  },
  writeParameterData: function writeParameterData(buffer, parameter) {
    if (parameter.value != null) {
      buffer.writeUInt8(2);
      buffer.writeInt16LE(parseInt(parameter.value));
    } else {
      buffer.writeUInt8(0);
    }
  },
  validate: function validate(value) {
    if (value == null) {
      return null;
    }

    value = parseInt(value);

    if (isNaN(value)) {
      return new TypeError('Invalid number.');
    }

    if (value < -32768 || value > 32767) {
      return new TypeError('Value must be between -32768 and 32767.');
    }

    return value;
  }
};