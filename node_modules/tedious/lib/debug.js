"use strict";

const EventEmitter = require('events').EventEmitter;

const util = require('util');

class Debug extends EventEmitter {
  /*
    @options    Which debug details should be sent.
                data    - dump of packet data
                payload - details of decoded payload
  */
  constructor({
    data = false,
    payload = false,
    packet = false,
    token = false
  } = {}) {
    super();
    this.options = {
      data,
      payload,
      packet,
      token
    };
    this.indent = '  ';
  }

  packet(direction, packet) {
    if (this.haveListeners() && this.options.packet) {
      this.log('');
      this.log(direction);
      this.log(packet.headerToString(this.indent));
    }
  }

  data(packet) {
    if (this.haveListeners() && this.options.data) {
      this.log(packet.dataToString(this.indent));
    }
  }

  payload(generatePayloadText) {
    if (this.haveListeners() && this.options.payload) {
      this.log(generatePayloadText());
    }
  }

  token(token) {
    if (this.haveListeners() && this.options.token) {
      this.log(util.inspect(token, {
        showHidden: false,
        depth: 5,
        colors: true
      }));
    }
  }

  haveListeners() {
    return this.listeners('debug').length > 0;
  }

  log(text) {
    this.emit('debug', text);
  }

}

module.exports = Debug;