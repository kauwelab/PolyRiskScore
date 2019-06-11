"use strict";

const BitN = require('./bitn');

module.exports = {
  id: 0x32,
  type: 'BIT',
  name: 'Bit',
  declaration: function declaration() {
    return 'bit';
  },
  writeTypeInfo: function writeTypeInfo(buffer) {
    buffer.writeUInt8(BitN.id);
    buffer.writeUInt8(1);
  },
  writeParameterData: function writeParameterData(buffer, parameter) {
    if (typeof parameter.value === 'undefined' || parameter.value === null) {
      buffer.writeUInt8(0);
    } else {
      buffer.writeUInt8(1);
      buffer.writeUInt8(parameter.value ? 1 : 0);
    }
  },
  validate: function validate(value) {
    if (value == null) {
      return null;
    }

    if (value) {
      return true;
    } else {
      return false;
    }
  }
};