(function (exports) {
    exports.validateRefgen = function (refGen) {
        //check that we have been given a valid refgen
	if (["hg17", "hg18", "hg19", "hg38"].includes(refGen.toLowerCase())){
            return refGen.toLowerCase()
        }
	else if (refGen === "default") {
	    return "hg38"
	}
        else {
            throw "invalid reference genome"
        }
    }

})(typeof exports === 'undefined' ? this['inputValidator'] = {} : exports);
