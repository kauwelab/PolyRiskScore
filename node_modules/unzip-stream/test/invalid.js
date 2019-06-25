'use strict';

var test = require('tap').test;
var fs = require('fs');
var path = require('path');
var temp = require('temp');
var dirdiff = require('dirdiff');
var unzip = require('../');

test("parse archive w/ no signature", function (t) {
  var archive = path.join(__dirname, '../testData/invalid/archive.zip');

  var self = this;
  var gotError = false;
  var unzipParser = unzip.Parse();
  fs.createReadStream(archive).pipe(unzipParser);
  unzipParser.on('error', function(err) {
    if (err.message.indexOf('Not a valid') === -1) {
      throw new Error('Expected invalid archive error');
    }
    t.end();
  });

  unzipParser.on('close', function() {
    if (gotError) return;
    throw new Error('Expected an error');
  });
});
