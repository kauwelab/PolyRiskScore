(function (exports) {

    //a "map" of diseases to their respective studies. Made global for easy access
    var diseasesAndStudies = {};
    diseasesAndStudies['ALL'] = ['High Impact', 'Largest Cohort'];
    diseasesAndStudies['ADHD'] = ['Demontis et al. 2018'/*, 'Hawi et al. 2018', 'Hinney et al. 2011', 'Mick et al. 2010', 
                                    'Stergiakouli et al. 2012', 'Zayats et al. 2015'*/];
    diseasesAndStudies['AD'] = [/*'Lambert et al. 2013 (High Impact)'*/, 'Naj et al. 2011'/*, 'Largest Cohort'*/];
    diseasesAndStudies['ALS'] = ['Ahmeti KB 2012'/*, 'Diekstra FP 2014', 'Landers JE 2009', 'van Rheenen W 2016 (High Impact)'*/];
    diseasesAndStudies['DEP'] = [/*'Ripke et al. 2012 (High Impact)',*/ 'Wray et al. 2018 (Largest Cohort)'];
    /*diseasesAndStudies['CHD'] = ['Coronary Artery Disease (C4D) Genetics Consortium 2011', 'Samani NJ 2007', 'Schunkert H 2011',
                                     'Wild PS 2011'];*/
    //freeze the object so it can't be edited by the browser or server
    diseasesAndStudies = Object.freeze(diseasesAndStudies);

    /**
     * Rurns the diseasesAndStudies object
     */
    exports.getDiseasesAndStudiesObj = function () {
        return diseasesAndStudies
    }

    /**
     * Gets the studies associated with the specified disease and study type from the diseasesAndStudies object
     * @param {*} disease 
     * @param {*} studyType 
     */
    function getStudiesFromDisease(disease, studyType) {
        disease = disease.toUpperCase();
        var possibleStudies = diseasesAndStudies[disease];
        var relevantStudies = []
        //for each study in the possibleStudies list, determine if it fits the requested studyType, 
        //remove the string that identifies it's type and (if the study is not empty) add it to the 
        //relevantStudies list
        possibleStudies.forEach(function (study) {
            if (studyType == "high impact") {
                if (study.toLowerCase().includes("high impact")) {
                    study = getStudyNameFromStudyEntry(study);
                    if (study != "") {
                        relevantStudies.push(study);
                    }
                }
            }
            else if (studyType == "largest cohort") {
                if (study.toLowerCase().includes("largest cohort")) {
                    study = getStudyNameFromStudyEntry(study);
                    if (study != "") {
                        relevantStudies.push(study);
                    }
                }
            }
            //if we don't have a studyType, or the study type is "all", just append all studies
            else {
                study = getStudyNameFromStudyEntry(study);
                //test doesn't include to avoid duplicate studies
                if (study != "" && !relevantStudies.includes(study)) {
                    relevantStudies.push(study);
                }
            }
        });
        return relevantStudies;
    }

    /**
     * Removes "High impact" and "Largest cohort" from the study name
     * @param {*} study 
     */
    function getStudyNameFromStudyEntry(study) {
        return study.replace(" (High Impact)", "").replace("High Impact", "").replace(" (Largest Cohort)", "").replace("Largest Cohort", "")
    }

    /**
     * Creates an object with diseases requested mapped to their corresponding studies. 
     * studyType narrows down what studies are searched.
     * @param {*} diseaseArray an array of diseases for which the user wants the risk scores to be calculated.
     * @param {*} studyType can be either "high impact", "largest cohort", or "". If "", all studies for each disease are returned in the object.
     */
    exports.makeDiseaseStudyMapArray = function (diseaseArray, studyType) {
        var diseaseStudyMapArray = [];
        //if the user doesn't specify any diseases, do all of them
        if (diseaseArray == undefined || diseaseArray.length <= 0) {
            diseaseArray = [];
            for (var diseaseName in diseasesAndStudies) {
                if (diseaseName !== "ALL") {
                    if (diseasesAndStudies.hasOwnProperty(diseaseName)) {
                        diseaseArray.push(diseaseName);
                    }
                }
            }
        }
        //else, make the diseaseStudyMapArray based on their disease list
        diseaseArray.forEach(function (disease) {
            var studies = getStudiesFromDisease(disease, studyType)
            //if there are studies for that disease based on the user's parameters, push the disease with it's studies onto the obj
            if (studies.length > 0) {
                diseaseStudyMapArray.push({
                    disease: disease.toLowerCase(),
                    studies: studies
                });
            }
        });
        return diseaseStudyMapArray;
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
    exports.calculateScore = function (tableObj, vcfObj, pValue) {
        var resultJsons = [];
        if (vcfObj == undefined || vcfObj.size <= 0) {
            throw "The vcf was undefined when calculating the score. Please choose a different vcf or reload the page and try again."
        }
        else {
            //push information about the calculation to the result
            resultJsons.push({ pValueCutoff: pValue, totalVariants: Array.from(vcfObj.entries())[0][1].length })
            //for each individual and each disease and each study in each disease and each snp of each individual, 
            //calculate scores and push results and relevant info to objects that are added to the diseaseResults array
            //TODO change snpMap name to snpEntry or some equivalent name
            for (const [individualName, vcfSNPObjs] of vcfObj.entries()) {
                var diseaseResults = [];
                tableObj.forEach(function (diseaseEntry) {
                    var studyResults;
                    studyResults = [];
                    diseaseEntry.studiesRows.forEach(function (studyEntry) {
                        var ORs = []
                        var snpsIncluded = [];
                        var chromPositionsIncluded = []
                        vcfSNPObjs.forEach(function (vcfSNPObj) {
                            vcfSNPObj.alleleArray.forEach(function (allele) {
                                studyEntry.rows.forEach(function (tableRow) {
                                    //TODO can this be short stopped? Once it's found, break?
                                    //by now, we don't have to check for study or pValue, because rowsObj already has only those values
                                    if (allele !== null) {
                                        if ((vcfSNPObj.snp == tableRow.snp || vcfSNPObj.pos == tableRow.pos) && tableRow.riskAllele === allele) {
                                            ORs.push(tableRow.oddsRatio);
                                            snpsIncluded.push(tableRow.snp);
                                            chromPositionsIncluded.push(tableRow.pos);
                                        }
                                    }
                                    else {
                                        if (vcfSNPObj.snp == tableRow.snp || vcfSNPObj.pos == tableRow.pos) {
                                            ORs.push(tableRow.oddsRatio);
                                            snpsIncluded.push(tableRow.snp);
                                            chromPositionsIncluded.push(tableRow.pos);
                                        }
                                    }
                                });
                            });
                        });
                        studyResults.push({
                            study: studyEntry.study,
                            oddsRatio: getCombinedORFromArray(ORs),
                            percentile: "",
                            numSNPsIncluded: ORs.length,
                            chromPositionsIncluded: chromPositionsIncluded,
                            snpsIncluded: snpsIncluded
                        });
                    });
                    diseaseResults.push({
                        disease: diseaseEntry.disease.toUpperCase(),
                        studyResults: studyResults
                    });
                });
                resultJsons.push({ individualName: this.trim(individualName), diseaseResults: diseaseResults })
            }
            return JSON.stringify(resultJsons);
        }
    };

    //exports.getCombinedORFromArray = function(ORs) {
    function getCombinedORFromArray(ORs) {
        //calculate the combined odds ratio from the odds ratio array (ORs)
        var combinedOR = 0;
        ORs.forEach(function (element) {
            combinedOR += Math.log(element);
        });
        combinedOR = Math.exp(combinedOR / ORs.length);
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
        if (vcfObj.size === 0) {
            vcfLine.sampleinfo.forEach(function (sample) {
                vcfObj.set(sample.NAME, []);
            });
        }
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
            var alleles = sample.GT.split(/[|/]+/, 2);
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
            //TODO
            //newMap.set(vcfLine.id, alleles);
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