"use strict";

const MoneyN = require('./moneyn');

module.exports = {
  id: 0x3C,
  type: 'MONEY',
  name: 'Money',
  declaration: function declaration() {
    return 'money';
  },
  writeTypeInfo: function writeTypeInfo(buffer) {
    buffer.writeUInt8(MoneyN.id);
    buffer.writeUInt8(8);
  },
  writeParameterData: function writeParameterData(buffer, parameter) {
    if (parameter.value != null) {
      buffer.writeUInt8(8);
      buffer.writeMoney(parameter.value * 10000);
    } else {
      buffer.writeUInt8(0);
    }
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