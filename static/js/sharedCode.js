(function (exports) {

    /**
     * Rurns the diseasesAndStudies object
     * TODO soon to be removed
     */
    exports.getDiseasesAndStudiesObj = function () {
        return diseasesAndStudies
    }
    /**
     * Calculates the polygenetic risk score using table rows from the database and the vcfObj.
     * If the vcfObj is undefined, throws an error message that can be printed to the user.
     * P-value is required so the result can also return information about the calculation.
     * @param {*} tableObj 
     * @param {*} vcfObj 
     * @param {*} pValue 
     * @return a string in JSON format of each idividual, their scores, and other information about their scores.
     */
    exports.calculateScore = function (assocationData, greppedSamples, pValue, associMap) {
        var resultJsons = [];
        if (greppedSamples == undefined || greppedSamples.size <= 0) {
            throw "The input was undefined when calculating the score. Please check your input file or text or reload the page and try again."
        }
        else {
            //push information about the calculation to the result
            resultJsons.push({ pValueCutoff: pValue, totalVariants: Array.from(greppedSamples.entries())[0][1].length })

            //for each individual, get a map containing all studies to the oddsRatios, snps and pos associated to each study and individual
            //then convert this map into the right format for results
            //for each individual and their snp info in the vcf object
            for (const [individualName, individualSNPObjs] of greppedSamples.entries()) {
                //key value pairs- study:{oddsRatios, snps, pos}
                var studyObjs = new Map();
                //for each snp of the individual in the vcf
                individualSNPObjs.forEach(function (individualSNPObj) {
                    //using the individualSNPObj.pos as key, gets all corresponding databasePosObjs from the database through
                    //usefulPos. Each databasePosObj contains: snp, pos, oddsRatio, allele, study, and trait
                    //databasePosObjs will normally only be size 1, but when mutiple studies have the same allele, it will be longer
                    var databasePosObjs = Array.from(associMap.get(individualSNPObj.pos))
                    databasePosObjs.forEach(function (databasePosObj) {
                        var oddsRatioTempList = [];
                        var snpTempList = [];
                        var posTempList = [];
                        //for each allele of the vcf snp obj
                        individualSNPObj.alleleArray.forEach(function (allele) {
                            //if the vcf allele matches the database allele 
                            if ((allele !== null && databasePosObj.allele === allele) || allele == null) {
                                oddsRatioTempList.push(databasePosObj.oddsRatio)
                                snpTempList.push(databasePosObj.snp)
                                posTempList.push(databasePosObj.pos)
                            }
                        });
                        //if there is new data to be added (one or both of the sample alleles matched the risk allele),
                        //add the new data to the studyObjs
                        if (oddsRatioTempList.length > 0) {
                            //if the study has already been initialized and added to studyObjs add the new data to the existing studyObj
                            if (studyObjs.has(databasePosObj.study)) {
                                var studyObj = studyObjs.get(databasePosObj.study);
                                studyObj.oddsRatios = studyObj.oddsRatios.concat(oddsRatioTempList);
                                studyObj.snps = studyObj.snps.concat(snpTempList);
                                studyObj.pos = studyObj.pos.concat(posTempList);
                                studyObjs.set(databasePosObj.study, studyObj)
                            }
                            //otherwise create a new study entry in studyObjs with the new data
                            else {
                                var studyObj = {
                                    oddsRatios: oddsRatioTempList,
                                    snps: snpTempList,
                                    pos: posTempList
                                }
                                studyObjs.set(databasePosObj.study, studyObj)
                            }
                        }
                    });
                });

                var traitResults = [];
                //for each database trait
                Object.keys(assocationData).forEach(function (trait) {
                    var traitEntry = assocationData[trait]
                    var studyResults = [];
                    //for each study in the database trait
                    Object.keys(traitEntry).forEach(function (studyID) {
                        var studyEntry = traitEntry[studyID];
                        var citation = studyEntry["citation"];
                        //if the study has results, push the study results to the study results for the trait
                        if (studyObjs.has(citation)) {
                            studyResults.push({
                                citation: citation,
                                //studyID: ,
                                oddsRatio: getCombinedORFromArray(studyObjs.get(citation).oddsRatios),
                                percentile: "",
                                numSNPsIncluded: studyObjs.get(citation).snps.length,
                                chromPositionsIncluded: studyObjs.get(citation).pos,
                                snpsIncluded: studyObjs.get(citation).snps
                            });
                        }
                        //otherwise create empty results
                        else {
                            studyResults.push({
                                study: citation,
                                oddsRatio: 1,
                                percentile: "",
                                numSNPsIncluded: 0,
                                chromPositionsIncluded: [],
                                snpsIncluded: []
                            });
                        }
                    });
                    //push the trait to the trait results list
                    traitResults.push({
                        trait: trait,
                        studyResults: studyResults
                    });
                });
                //create a new JSON object containing the individual name followed by their trait results list
                resultJsons.push({ individualName: this.trim(individualName), traitResults: traitResults })
            }
            //convert the result JSON list to a string and return
            return JSON.stringify(resultJsons);
        }
    };

    function getCombinedORFromArray(ORs) {
        //calculate the combined odds ratio from the odds ratio array (ORs)
        var combinedOR = 0;
        ORs.forEach(function (element) {
            combinedOR += Math.log(element);
        });
        combinedOR = Math.exp(combinedOR);
        return combinedOR;
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
                //if the allele is ".", ignore it
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

    /**
     * Gets a map where the keys are pos or snpIDs and the values are sets of objects correspoinding to a single association
     * {snp, pos, oddsRatio, allele, study, trait}. Whethere the keys are pos or snpIDs depends on the "isPosBased boolean." 
     * If isPosBased is true, the keys are pos, otherwise they are snp ids. isPosBased is true for file calculations and false
     * for text calculations.
     */
    exports.getAssociationMap = function (associationData, isPosBased) {
        var tableObj = associationData;

        var usefulIdentifiers = new Map()

        var traits = Object.keys(tableObj)
        //for each database trait
        for (let i = 0; i < traits.length; ++i) {
            var trait = traits[i];
            var traitObj = tableObj[trait];
            var studyIDs = Object.keys(traitObj)

            //for each study in the database trait
            for (let j = 0; j < studyIDs.length; ++j) {
                var studyID = studyIDs[j]
                var studyIDObj = traitObj[studyID]
                var citation = studyIDObj["citation"]
                var associations = studyIDObj["associations"]

                //for each row  of the study in the database trait
                for (let k = 0; k < associations.length; ++k) {
                    //create a key value pair with the key being the position or snpID
                    //and the value being a set of identifier objects corresponding to
                    //row values within the database
                    var identifier = "";
                    var pos = associations[k].pos;
                    var snp = associations[k].snp;
                    if (isPosBased) {
                        identifier = pos;
                    }
                    else {
                        identifier = snp;
                    }
                    var indentifierObj = {
                        snp: snp,
                        pos: pos,
                        oddsRatio: associations[k].oddsRatio,
                        allele: associations[k].riskAllele,
                        study: citation,
                        trait: trait
                    }
                    //if the pos or id is already in the map, add the new indentifierObj to the set at that key
                    if (usefulIdentifiers.has(identifier)) {
                        usefulIdentifiers.set(identifier, usefulIdentifiers.get(identifier).add(indentifierObj));
                    }
                    //otherwise create a new key value pair
                    else {
                        usefulIdentifiers.set(identifier, new Set([indentifierObj]));
                    }
                }
            }
        }
        return usefulIdentifiers;
    }

})(typeof exports === 'undefined' ? this['sharedCode'] = {} : exports);
