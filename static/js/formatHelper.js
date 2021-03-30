(function (exports) {
    exports.formatForTableName = function (traitName) {
        // formatting trait names for database use
        // all lowercase, spaces to underscores, forward slashes to dashes, no commas or apostrophies
        const spacesRegex = / /g;
        const forwardSlashesRegex = /\//g;
        const commaRegex = /,/g;
        const apostrophiesRegex = /'/g;
        const quoteRegex = /"/g;

        traitName = traitName.toLowerCase().replace(spacesRegex, "_").replace(commaRegex, "").replace(forwardSlashesRegex, "-").replace(apostrophiesRegex, "").replace(quoteRegex, "");

        if (traitName.length > 64) {
            traitName = traitName.slice(0, 64)
        }

        return traitName
    }

    exports.formatForWebsite = function (traitName) {
        //underscores to spaces, title case
        const underscoreRegex = /_/g;

        return toTitleCase(traitName.replace(underscoreRegex, " "))
    }

    //title case with two exeptions- letters already in uppercase stay uppercase and "ii" turns to 'II"
    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                //for Roman numeral 2, return II. ex "Type II Diabetes Mellitus"
                if (txt == "ii") {
                    return "II";
                }
                return txt.charAt(0).toUpperCase() + txt.substr(1); //don't lowercase anything already uppercase
            }
        );
    }

    exports.formatForClumpsTable = function (superPop) {
        if (superPop.toLowerCase() == "african" || superPop.toLowerCase() == "afr") {
            return "african_Clump"
        }
        else if (superPop.toLowerCase() == "american" || superPop.toLowerCase() == "amr") {
            return "american_Clump"
        }
        else if (superPop.toLowerCase() == "east asian" || superPop.toLowerCase() == "eas") {
            return "eastAsian_Clump"
        }
        else if (superPop.toLowerCase() == "european" || superPop.toLowerCase() == "eur") {
            return "european_Clump"
        }
        else if (superPop.toLowerCase() == "south asian" || superPop.toLowerCase() == "sas") {
            return "southAsian_Clump"
        }
        return "error"
    }
})(typeof exports === 'undefined' ? this['formatHelper'] = {} : exports);
