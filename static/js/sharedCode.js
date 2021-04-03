(function (exports) {
    /**
     * Calculates the polygenetic risk score using table rows from the database and the vcfObj.
     * If the vcfObj is undefined, throws an error message that can be printed to the user.
     * P-value is required so the result can also return information about the calculation.
     * @param {*} tableObj 
     * @param {*} vcfObj 
     * @param {*} pValue 
     * @return a string in JSON format of each idividual, their scores, and other information about their scores.
     */
    exports.calculateScore = function (associationData, clumpsData, greppedSamples, pValue, totalInputVariants) {
        var resultObj = {};
        var indexSnpObj = {};
        var resultJsons = {};
        var unusedTraitStudyCombo = new Set()

        if (greppedSamples == undefined) {
            throw "The input was undefined when calculating the score. Please check your input file or text or reload the page and try again."
        }
        else {
            //add information to results
            resultJsons = { 
                pValueCutoff: pValue, 
                totalVariants: totalInputVariants,
                studyResults: {}
            }
            //if the input data has at least one individual
            if (greppedSamples.size > 0) {
                //for each individual, get a map containing all studies to the oddsRatios, snps and pos associated to each study and individual
                //then convert this map into the right format for results
                //for each individual and their snp info in the vcf object
                for (const [individualName, individualSNPObjs] of greppedSamples.entries()) {
                    for (studyID in associationData['studyIDsToMetaData']) {
                        for (trait in associationData['studyIDsToMetaData'][studyID]['traits']) {
                            if ('traitsWithDuplicateSnps' in associationData['studyIDsToMetaData'][studyID] && associationData['studyIDsToMetaData'][studyID]['traitsWithDuplicateSnps'].includes(trait)) {
                                printStudyID = studyID.concat('†')
                            }
                            else {
                                printStudyID = studyID
                            }

                            if (!(printStudyID in resultObj)) {
                                resultObj[printStudyID] = {}
                            }
                            if (!(trait in resultObj[printStudyID])) {
                                resultObj[printStudyID][trait] = {}
                            }
                            if (!(individualName in resultObj[printStudyID][trait])) {
                                resultObj[printStudyID][trait][individualName] = {
                                    snps: {},
                                    variantsWithUnmatchedAlleles: [],
                                    variantsInHighLD: []
                                }
                            }
                            if (!([trait, studyID, individualName].join("|") in indexSnpObj)) {
                                indexSnpObj[[trait, studyID, individualName].join("|")] = {}
                            }
                        }
                    }

                    //for each snp of the individual in the vcf
                    individualSNPObjs.forEach(function (individualSNPObj) {
                        //using the individualSNPObj.pos as key, gets all corresponding databasePosObjs from the database through
                        //usefulPos. Each databasePosObj contains: snp, pos, oddsRatio, allele, study, traits, reportedTraits, and studyID
                        //databasePosObjs will normally only be size 1, but when mutiple studies have the same allele, it will be longer
                        key = individualSNPObj.snp
                        alleles = individualSNPObj.alleleArray

                        if (!key.includes("rs")) {
                            if (individualSNPObj.pos in associationData['associations']){
                                key = associationData['associations'][individualSNPObj.pos]
                            }
                        }

                        if (key in associationData['associations'] && alleles != []) {
                            for (trait in associationData['associations'][key]['traits']) {
                                for (studyID in associationData['associations'][key]['traits'][trait]) {
                                    printStudyID = studyID
                                    traitStudySamp = [trait, studyID, individualName].join("|")
                                    associationObj = associationData['associations'][key]['traits'][trait][studyID]
                                    if ('traitsWithDuplicateSnps' in associationData['studyIDsToMetaData'][studyID]) {
                                        if (associationData['studyIDsToMetaData'][studyID]['traitsWithDuplicateSnps'].includes(trait)) {
                                            printStudyID = studyID.concat('†')
                                        }
                                    }

                                    if (associationObj.pValue <= pValue) {
                                        numAllelesMatch = 0
                                        for (i=0; i < alleles.length; i++) {
                                            allele = alleles[i]
                                            if (allele == associationObj.riskAllele){
                                                numAllelesMatch++;
                                            }
                                            else {
                                                resultObj[printStudyID][trait][individualName]['variantsWithUnmatchedAlleles'].push(key)
                                            }
                                        }
                                        if (numAllelesMatch > 0) {
                                            if (clumpsData !== undefined && key in clumpsData) {
                                                clumpNum = clumpsData[key]['clumpNum']
                                                if (clumpNum in indexSnpObj[traitStudySamp]) {
                                                    indexClumpSnp = indexSnpObj[traitStudySamp][clumpNum]
                                                    indexPvalue = associationData['associations'][indexClumpSnp]['traits'][trait][studyID]['pValue']
                                                    if (associationObj.pValue < indexPvalue) {
                                                        delete resultObj[printStudyID][trait][individualName]['snps'][indexClumpSnp] //TODO test that this worked
                                                        resultObj[printStudyID][trait][individualName]['variantsInHighLD'].push(indexClumpSnp)
                                                        resultObj[printStudyID][trait][individualName]['snps'][key] = numAllelesMatch
                                                        indexSnpObj[traitStudySamp][clumpNum] = key
                                                    }
                                                    else {
                                                        // add the current snp to neutral snps
                                                        resultObj[printStudyID][trait][individualName]['variantsInHighLD'].push(key)
                                                    }
                                                }
                                                else {
                                                    // add the clumpNum/key to the indexSnpObj
                                                    indexSnpObj[traitStudySamp][clumpNum] = key
                                                    resultObj[printStudyID][trait][individualName]['snps'][key] = numAllelesMatch
                                                }
                                            } else {
                                                // just add the snp to calculations
                                                resultObj[printStudyID][trait][individualName]['snps'][key] = numAllelesMatch
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    })
                }

                for (studyID in resultObj) {
                    if (studyID.includes('†')) {
                        studyID_og = studyID.slice(0, -1)
                    }
                    else {
                        studyID_og = studyID
                    }
                    tmpStudyObj = {
                        citation: associationData['studyIDsToMetaData'][studyID_og]['citation'],
                        reportedTrait: associationData['studyIDsToMetaData'][studyID_og]['reportedTrait'],
                        traits: {}
                    }
                    for (trait in resultObj[studyID]) {
                        tmpTraitObj = {}
                        atLeastOneGoodSamp = false
                        for (sample in resultObj[studyID][trait]) {
                            scoreAndSnps = calculateCombinedORandFormatSnps(resultObj[studyID][trait][sample], trait, studyID_og, associationData)
                            tmpSampleObj = {
                                oddsRatio: scoreAndSnps[0],
                                protectiveVariants: scoreAndSnps[2],
                                riskVariants: scoreAndSnps[1],
                                unmatchedVariants: scoreAndSnps[3],
                                clumpedVariants: scoreAndSnps[4]
                            }
                            tmpTraitObj[this.trim(sample)] = tmpSampleObj
                            if (tmpSampleObj.oddsRatio != "NF" || tmpSampleObj.unmatchedVariants.length != 0) {
                                atLeastOneGoodSamp = true
                            }
                        }
                        if (atLeastOneGoodSamp) {
                            tmpStudyObj['traits'][trait] = tmpTraitObj
                        }
                        else {
                            tmpStudyObj['traits'][trait] = {}
                            unusedTraitStudyCombo.add([trait, studyID_og])
                            delete tmpStudyObj['traits'][trait]
                        }
                    }
                    if (atLeastOneGoodSamp) {
                        resultJsons['studyResults'][studyID] = tmpStudyObj
                    }
                }
            }
            //if the input data doesn't have an individual in it (we can assume this is a text input query with no matching SNPs)
            //TODO fill this out
            else {

            }
            //convert the result JSON list to a string, the unusedTraitStudyCombo to array and return
            return [JSON.stringify(resultJsons), Array.from(unusedTraitStudyCombo)];
        }
    };

    function calculateCombinedORandFormatSnps(sampleObj, trait, studyID, associationData) {
        var combinedOR = 0;
        var protective = new Set()
        var risk = new Set()
        var unmatched = new Set(sampleObj.variantsWithUnmatchedAlleles)
        var clumped = new Set(sampleObj.variantsInHighLD)

        //calculate the odds ratio and determine which alleles are protective, risk, and neutral
        for (snp in sampleObj['snps']) {
            snpDosage = sampleObj['snps'][snp]
            snpOR = associationData['associations'][snp]['traits'][trait][studyID]['oddsRatio']
            combinedOR += (Math.log(snpOR) * snpDosage)
            if (snpOR > 1) {
                risk.add(snp)
            }
            else if (snpOR < 1) {
                protective.add(snp)
            }
        }

        if (combinedOR === 0) {
            combinedOR = "NF"
        }
        else {
            combinedOR = Math.exp(combinedOR);
        }

        return [combinedOR, Array.from(risk), Array.from(protective), Array.from(unmatched), Array.from(clumped)]
    }


    /**
     * Trims the whitespace from both the begginning and the end of the string and returns it.
     * @param {*} str 
     */
    exports.trim = function (str) {
        return str.replace(/^\s+|\s+$/gm, '');
    };

    exports.addLineToVcfObj = function (vcfObj, vcfLine) {
        //gets all possible alleles for the current id
        var possibleAlleles = [];
        possibleAlleles.push(vcfLine.ref);
        var altAlleles = vcfLine.alt.split(/[,]+/);
        for (var i = 0; i < altAlleles.length; i++) {
            if (altAlleles[i] == ".") {
                altAlleles.splice(i, 1);
                --i;
            }
        }
        if (altAlleles.length > 0) {
            possibleAlleles = possibleAlleles.concat(altAlleles);
        }

        vcfLine.sampleinfo.forEach(function (sample) {
            var vcfSNPObjs = vcfObj.get(sample.NAME);
            //gets the allele indices
            var alleles = sample.GT.trim().split(/[|/]+/, 2);
            //gets the alleles from the allele indices and replaces the indices with the alleles.
            for (var i = 0; i < alleles.length; i++) {
                //if the allele is ".", ignore it (consider it as the non risk allele)
                if (alleles[i] == ".") {
                    //alleles[i] = possibleAlleles[0];
                    alleles.splice(i, 1);
                    --i;
                }
                else {
                    alleles[i] = possibleAlleles[alleles[i]];
                }
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
    };

})(typeof exports === 'undefined' ? this['sharedCode'] = {} : exports);
