(function (exports) {

    //a "map" of diseases to their respective studies. Made global for easy access
    var diseasesAndStudies = {};
    diseasesAndStudies['ALL'] = ['High Impact', 'Largest Cohort'];
    diseasesAndStudies['ADHD'] = ['High Impact', 'Largest Cohort'];
    diseasesAndStudies['AD'] = ['Lambert et al., 2013 (High Impact)', 'Largest Cohort'];
    diseasesAndStudies['ALS'] = ['van Rheenen W, 2016 (High Impact)', 'van Rheenen W, 2016 (Largest Cohort)'];
    diseasesAndStudies['DEP'] = ['High Impact', 'Largest Cohort'];
    diseasesAndStudies['HD'] = ['High Impact', 'Largest Cohort'];
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
    //exports.getStudiesFromDisease = function (disease, studyType) {
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
                if (study.toLowerCase().includes("large cohort")) {
                    study = getStudyNameFromStudyEntry(study);
                    if (study != "") {
                        relevantStudies.push(study);
                    }
                }
            }
            //if we don't have a studyType, just append all studies
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
     * @param {*} studyType can be either "high impact", "large cohort", or "". If "", all studies for each disease are returned in the object.
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
     * P-value is required so the result can also return information about the calculation.
     * @param {*} tableObj 
     * @param {*} vcfObj 
     * @param {*} pValue 
     * @return a string in JSON format of each idividual, their scores, and other information about their scores.
     */
    exports.calculateScore = function (tableObj, vcfObj, pValue) {
        var resultJsons = [];
        //push information about the calculation to the result
        resultJsons.push({ pValueCutoff: pValue, totalVariants: Array.from(vcfObj.entries())[0][1].size })
        //for each individual and each disease and each study in each disease and each snp of each individual, 
        //calculate scores and push results and relevant info to objects that are added to the diseaseResults array
        for (const [individualName, snpMap] of vcfObj.entries()) {
            var diseaseResults = [];
            tableObj.forEach(function (diseaseEntry) {
                var studyResults;
                diseaseEntry.studiesRows.forEach(function (studyEntry) {
                    studyResults = [];
                    var ORs = []
                    var snpsUsed = [];
                    for (const [snp, alleleArray] of snpMap.entries()) {
                        alleleArray.forEach(function (allele) {
                            studyEntry.rows.forEach(function (row) {
                                //by now, we don't have to check for study or pValue, because rowsObj already has only those values
                                if (allele !== null) {
                                    if (snp == row.snp && row.riskAllele === allele) {
                                        ORs.push(row.oddsRatio);
                                        snpsUsed.push(row.snp);
                                    }
                                }
                                else {
                                    if (snp == row.snp) {
                                        ORs.push(row.oddsRatio);
                                        snpsUsed.push(row.snp);
                                    }
                                }
                            });
                        });
                    }
                    studyResults.push({
                        study: studyEntry.study,
                        oddsRatio: getCombinedORFromArray(ORs),
                        percentile: "",
                        numVariantsIncluded: ORs.length,
                        variantsIncluded: snpsUsed
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
    };

    //exports.getCombinedORFromArray = function(ORs) {
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
    }

})(typeof exports === 'undefined' ? this['sharedCode'] = {} : exports);