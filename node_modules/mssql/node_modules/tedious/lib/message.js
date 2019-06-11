"use strict";

const _require = require('readable-stream'),
      PassThrough = _require.PassThrough;

class Message extends PassThrough {
  constructor({
    type,
    resetConnection = false
  }) {
    super();
    this.type = type;
    this.resetConnection = resetConnection;
  }

}

module.exports = Message;