"use strict";

const guidParser = require('../guid-parser');

module.exports = {
  id: 0x24,
  type: 'GUIDN',
  name: 'UniqueIdentifier',
  dataLengthLength: 1,
  declaration: function declaration() {
    return 'uniqueidentifier';
  },
  resolveLength: function resolveLength() {
    return 16;
  },
  writeTypeInfo: function writeTypeInfo(buffer) {
    buffer.writeUInt8(this.id);
    buffer.writeUInt8(0x10);
  },
  writeParameterData: function writeParameterData(buffer, parameter, options, cb) {
    if (parameter.value != null) {
      buffer.writeUInt8(0x10);
      buffer.writeBuffer(Buffer.from(guidParser.guidToArray(parameter.value)));
    } else {
      buffer.writeUInt8(0);
    }

    cb();
  },
  validate: function validate(value) {
    if (value == null) {
      return null;
    }

    if (typeof value !== 'string') {
      if (typeof value.toString !== 'function') {
        return TypeError('Invalid string.');
      }

      value = value.toString();
    }

    return value;
  }
};