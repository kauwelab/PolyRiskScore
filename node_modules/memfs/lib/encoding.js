"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors = require("./internal/errors");
exports.ENCODING_UTF8 = 'utf8';
function assertEncoding(encoding) {
    if (encoding && !Buffer.isEncoding(encoding))
        throw new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', encoding);
}
exports.assertEncoding = assertEncoding;
function strToEncoding(str, encoding) {
    if (!encoding || encoding === exports.ENCODING_UTF8)
        return str; // UTF-8
    if (encoding === 'buffer')
        return new Buffer(str); // `buffer` encoding
    return new Buffer(str).toString(encoding); // Custom encoding
}
exports.strToEncoding = strToEncoding;
