"use strict";

const MoneyN = require('./moneyn');

module.exports = {
  id: 0x7A,
  type: 'MONEY4',
  name: 'SmallMoney',
  declaration: function declaration() {
    return 'smallmoney';
  },
  writeTypeInfo: function writeTypeInfo(buffer) {
    buffer.writeUInt8(MoneyN.id);
    buffer.writeUInt8(4);
  },
  writeParameterData: function writeParameterData(buffer, parameter) {
    if (parameter.value != null) {
      buffer.writeUInt8(4);
      buffer.writeInt32LE(parameter.value * 10000);
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

    if (value < -214748.3648 || value > 214748.3647) {
      return new TypeError('Value must be between -214748.3648 and 214748.3647.');
    }

    return value;
  }
};