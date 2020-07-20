(function (exports) {

    exports.getVCFObj = function (fileLines) {
        var numSamples = 0;
        var sampleIndex = {}
        var vcfAttrib = {}
        var vcfObj = new Map();
        fileLines.forEach(function (line) {
            // check if line starts with hash and use them
            if (line.indexOf('#') === 0) {
                // #CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample1\tsample2\tsample3
                // set number of samples in vcf file
                if (line.match(/^#CHROM/)) {
                    //trim off the whitespace on the last sample's name
                    line = sharedCode.trim(line);
                    var sampleinfo = line.split('\t')
                    numSamples = sampleinfo.length - 9

                    for (var i = 0; i < numSamples; i++) {
                        sampleIndex[i] = sampleinfo[9 + i]
                        //remove white space from sample names
                        vcfObj.set(sampleinfo[9 + i], []);
                    }
                }
                else {
                    vcfAttrib = defineVCFAttributes(vcfAttrib, line); //Test to make sure this works!!
                }
            } else { // go through remaining lines
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
                //TODO can we remove vcfAttrib here to make this faster?
                var vcfLine = createVariantData(info, infoObject, sampleObject, vcfAttrib);
                vcfObj = sharedCode.addLineToVcfObj(vcfObj, vcfLine)
            }
        });
        return vcfObj;
    }

    function defineVCFAttributes(vcfAttrib, line) {
        // ##fileformat=VCFv4.1
        if (!vcfAttrib.vcf_v) {
            vcfAttrib.vcf_v = line.match(/^##fileformat=/) ? line.split('=')[1] : null
        }

        // ##samtoolsVersion=0.1.19-44428cd
        if (!vcfAttrib.samtools) {
            vcfAttrib.samtools = line.match(/^##samtoolsVersion=/) ? line.split('=')[1] : null
        }

        // ##reference=file://../index/Chalara_fraxinea_TGAC_s1v1_scaffolds.fa
        if (!vcfAttrib.refseq) {
            vcfAttrib.refseq = line.match((/^##reference=file:/)) ? line.split('=')[1] : null
        }

        return vcfAttrib;
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

    function createVariantData(info, infoObject, sampleObject, vcfAttrib) {

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
            attributes: vcfAttrib
        }

        return varData;
    }

})(typeof exports === 'undefined' ? this['vcf_parser'] = {} : exports);