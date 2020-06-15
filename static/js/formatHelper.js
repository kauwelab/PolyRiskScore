
exports.formatForTableName = function (traitName) {
    // formatting trait names for database use
    // all lowercase, spaces to underscores, forward slashes to dashes, no commas or apostrophies
    const spacesRegex = / /g;
    const forwardSlashesRegex = /\//g;
    const commaRegex = /,/g;
    const apostrophiesRegex = /'/g;
    const quoteRegex = /"/g;

    return traitName.toLowerCase().replace(spacesRegex, "_").replace(commaRegex, "").replace(forwardSlashesRegex,"-").replace(apostrophiesRegex, "").replace(quoteRegex, "");
}