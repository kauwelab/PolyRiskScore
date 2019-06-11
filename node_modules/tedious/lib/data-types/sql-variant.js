"use strict";

module.exports = {
  id: 0x62,
  type: 'SSVARIANTTYPE',
  name: 'Variant',
  dataLengthLength: 4,
  declaration: function declaration(parameter) {
    return 'sql_variant';
  }
};