
exports.formatForTableName = function (traitName) {
    // formatting trait names for database use
    // all lowecase, spaces to underscores, forward slashes to dashes, no commas or apostrophies
    const spacesRegex = / /g;
    const forwardSlashesRegex = /\//g;
    const commaRegex = /,/g;
    const apostrophiesRegex = /'/g;

    return traitName.toLowerCase().replace(spacesRegex, "_").replace(commaRegex, "").replace(forwardSlashesRegex,"-").replace(apostrophiesRegex, "");
}