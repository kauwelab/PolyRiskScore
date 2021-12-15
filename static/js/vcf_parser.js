(function (exports) {

    /**
     * Gets an object representing a VCF, given its file lines
     * @param {*} fileLines 
     * @returns vcfObj
     */
    exports.getVCFObj = function (fileLines, userMAF) {
        var numSamples = 0;
        var sampleIndex = {}
        var vcfObj = new Map();
        var mafData = {}
        containsAF = false
        fileLines.forEach(function (line) {
            // check if line starts with hash and use them
            if (line.indexOf('#') === 0) {
                // #CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample1\tsample2\tsample3
                // set number of samples in vcf file
                if (line.match(/^#CHROM/)) {
                    //trim off the whitespace on the last sample's name
                    line = trim(line);
                    var sampleinfo = line.split('\t')
                    numSamples = sampleinfo.length - 9

                    for (var i = 0; i < numSamples; i++) {
                        sampleIndex[i] = sampleinfo[9 + i]
                        //remove white space from sample names
                        vcfObj.set(sampleinfo[9 + i], []);
                    }
                } else if (line.includes("ID=AF") || line.includes('Description="Allele Frequency"')) {
                    containsAF = true
                }
            } else { // go through remaining lines
                if (!containsAF && userMAF){
                    throw "The uploaded file does not contain the required information for minor allele frequency. Please select a different cohort for maf or upload a different file."
                }
                // split line by tab character
                var info = line.split('\t')
                if (info.length < 9) {
                    //Throw an error if vcfObj is empty.
                    //This probably means the user uploaded an empty file or a file in the wrong format. 
                    if (vcfObj === undefined) {
                        throw "The file uploaded was not a valid vcf file. Please check your file and try again."
                    }
                    else if (vcfObj.size === 0) {
                        throw "The file uploaded was not a valid vcf file. Please check your file and try again."
                    }
                    return; //I'm assuming this will be for files that have a blank line or two at the end???
                }
                //make sampleObject
                var sampleObject = parseSampleInfo(numSamples, sampleIndex, info);
                // parse the variant call information
                var varInfo = info[7].split(';')
                // parse the variant information
                var infoObject = parseVariantData(varInfo, info);
                var vcfLine = createVariantData(info, infoObject, sampleObject);
                vcfObj = addLineToVcfObj(vcfObj, vcfLine)
                //if userMAF is true, create the maf for this line. If the VCF doesnt have AF (allele frequency) we need to throw an error
                if (userMAF) {
                    mafData[vcfLine.id] = {
                        chrom: vcfLine.chr,
                        pos: vcfLine.pos,
                        alleles: {}
                    }
                    af = vcfLine.varinfo.AF.split(',') //todo watch this, could end up causing an error if we don't check for it
                    refAF = 1 - af.reduce(function(a,b){return parseFloat(a)+parseFloat(b);})

                    mafData[vcfLine.id]['alleles'][vcfLine.ref] = refAF
                    altAlleles = vcfLine.alt.split(',')
                    for (i=0; i<altAlleles.length; i++) {
                        mafData[vcfLine.id]['alleles'][altAlleles[i]] = parseFloat(af[i])
                    }
                }
            }
        });
        return [vcfObj, mafData];
    }

    /**
     * Adds the contents of vcfLine to vcfObj
     * @param {*} vcfObj 
     * @param {*} vcfLine 
     * @returns vcfObj
     */
    var addLineToVcfObj = function (vcfObj, vcfLine) {
        //gets all possible alleles for the current id
        var possibleAlleles = [];
        possibleAlleles.push(vcfLine.ref);
        var altAlleles = vcfLine.alt.split(/[,]+/);
        if (altAlleles.length > 0) {
            possibleAlleles = possibleAlleles.concat(altAlleles);
        }

        vcfLine.sampleinfo.forEach(function (sample) {
            var vcfSNPObjs = vcfObj.get(sample.NAME);
            //gets the allele indices
            var alleles = sample.GT.trim().split(/[|/]+/, 2);
            //gets the alleles from the allele indices and replaces the indices with the alleles.
            for (var i = 0; i < alleles.length; i++) {
                alleles[i] = possibleAlleles[alleles[i]];
            }
            //event when alleles is empty, we still push it so that it can be included in 
            //the totalVariants number of the output
            var vcfSNPObj = {
                pos: vcfLine.chr.concat(":", vcfLine.pos),
                snp: vcfLine.id,
                alleleArray: alleles
            }
            vcfSNPObjs.push(vcfSNPObj);
            vcfObj.set(sample.NAME, vcfSNPObjs);
        });
        return vcfObj;
    }

    /**
     * Trims the whitespace from both the beginning and the end of the string and returns it.
     * @param {*} str 
     */
    var trim = function (str) {
        return str.replace(/^\s+|\s+$/gm, '');
    }

    function parseSampleInfo(numSamples, sampleIndex, info) {
        // format information ids
        var formatIds = info[8].split(':')

        // parse the sample information
        var sampleObject = []
        for (var j = 0; j < numSamples; j++) {
            var sampleData = {}
            sampleData['NAME'] = sampleIndex[j]
            var formatParts = info[9 + j].split(':')
            for (var k = 0; k < formatParts.length; k++) {
                sampleData[formatIds[k]] = formatParts[k]
            }
            sampleObject.push(sampleData)
        }

        return sampleObject;
    }

    function parseVariantData(varInfo, info) {
        //Better to make varInfo again here?? 
        var infoObject = {}

        // check if the variant is INDEL or SNP
        // and assign the specific type of variation identified
        var type
        var typeInfo
        if (varInfo[0].match(/^INDEL$/)) {
            type = 'INDEL'
            varInfo.shift()
            if (info[3].length > info[4].length) {
                typeInfo = 'deletion'
            } else if (info[3].length < info[4].length) {
                typeInfo = 'insertion'
            } else if (info[3].length === info[4].length) {
                typeInfo = 'substitution - multi'
            }
        } else {
            type = 'SNP'
            if (info[3].length === 1) {
                typeInfo = 'substitution'
            } else if (info[3].length > 1) {
                typeInfo = 'substitution - multi'
            }
        }
        infoObject['VAR'] = type
        infoObject['VARINFO'] = typeInfo

        // variant info added to object
        for (var l = 0; l < varInfo.length; l++) {
            var pair = varInfo[l].split('=')
            infoObject[pair[0]] = pair[1]
        }

        return infoObject;
    }

    function createVariantData(info, infoObject, sampleObject) {
        var varData = {
            chr: info[0],
            pos: info[1],
            id: info[2],
            ref: info[3],
            alt: info[4],
            qual: info[5],
            filter: info[6],
            varinfo: infoObject,
            sampleinfo: sampleObject,
        }

        return varData;
    }

})(typeof exports === 'undefined' ? this['vcf_parser'] = {} : exports);
