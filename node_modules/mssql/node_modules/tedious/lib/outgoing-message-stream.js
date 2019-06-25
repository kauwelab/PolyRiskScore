"use strict";

const BufferList = require('bl');

const _require = require('readable-stream'),
      Duplex = _require.Duplex;

const _require2 = require('./packet'),
      Packet = _require2.Packet,
      HEADER_LENGTH = _require2.HEADER_LENGTH;

class OutgoingMessageStream extends Duplex {
  constructor(debug, {
    packetSize
  }) {
    super({
      writableObjectMode: true
    });
    this.packetSize = packetSize;
    this.debug = debug;
    this.bl = new BufferList(); // When the writable side is ended, push `null`
    // to also end the readable side.

    this.on('finish', () => {
      this.push(null);
    });
  }

  _write(message, encoding, callback) {
    const length = this.packetSize - HEADER_LENGTH;
    let packetNumber = 0;
    this.currentMessage = message;
    this.currentMessage.on('data', data => {
      this.bl.append(data);

      while (this.bl.length > length) {
        const data = this.bl.slice(0, length);
        this.bl.consume(length); // TODO: Get rid of creating `Packet` instances here.

        const packet = new Packet(message.type);
        packet.packetId(packetNumber += 1);
        packet.resetConnection(message.resetConnection);
        packet.addData(data);
        this.debug.packet('Sent', packet);
        this.debug.data(packet);

        if (this.push(packet.buffer) === false) {
          this.currentMessage.pause();
        }
      }
    });
    this.currentMessage.on('end', () => {
      const data = this.bl.slice();
      this.bl.consume(data.length); // TODO: Get rid of creating `Packet` instances here.

      const packet = new Packet(message.type);
      packet.packetId(packetNumber += 1);
      packet.resetConnection(message.resetConnection);
      packet.last(true);
      packet.addData(data);
      this.debug.packet('Sent', packet);
      this.debug.data(packet);
      this.push(packet.buffer);
      this.currentMessage = undefined;
      callback();
    });
  }

  _read(size) {
    // If we do have a message, resume it and get data flowing.
    // Otherwise, there is nothing to do.
    if (this.currentMessage) {
      this.currentMessage.resume();
    }
  }

}

module.exports = OutgoingMessageStream;