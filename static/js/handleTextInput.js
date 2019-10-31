(function (exports) {
/**
 * Calculates the polygenetic risk score using table rows from the database and the textSnps.
 * If the textSnps is undefined, throws an error message that can be printed to the user.
 * P-value is required so the result can also return information about the calculation.
 * @param {*} tableObj 
 * @param {*} textSnps 
 * @param {*} pValue 
 * @return a string in JSON format of the calculated score and other information about it.
 */
exports.calculateScore = function(tableObj, textSnps, pValue) {
    var resultJsons = [];
    if (textSnps == undefined) {
        throw "The snps were undefined when calculating the score. Please retype the snps or choose a vcf."
    }
    else {
        //push information about the calculation to the result
        resultJsons.push({ pValueCutoff: pValue, totalVariants: textSnps.length })
        //for each individual and each disease and each study in each disease and each snp of each individual, 
        //calculate scores and push results and relevant info to objects that are added to the diseaseResults array
        //TODO change snpMap name to snpEntry or some equivalent name

        var diseaseResults = [];
        tableObj.forEach(function (diseaseEntry) {
            var studyResults;
            studyResults = [];
            diseaseEntry.studiesRows.forEach(function (studyEntry) {
                var ORs = []
                var snpsIncluded = [];
                var chromPositionsIncluded = []
                textSnps.forEach(function (key, value) { //don't know if this will work for the map. 
                    studyEntry.rows.forEach(function (tableRow) {
                        if (tableRow.snp === key) {
                            console.log("inside the calculation. mwahahahaha")
                            switch(value.size){
                                case 2:
                                    if (value[1] === tableRow.riskAllele) { //is this going to matter about order?
                                        ORs.push(tableRow.oddsRatio);
                                        snpsIncluded.push(tableRow.snp);
                                        chromPositionsIncluded.push(tableRow.pos);
                                    }
                                case 1:
                                    if (value[0] === tableRow.riskAllele) {
                                        ORs.push(tableRow.oddsRatio);
                                        snpsIncluded.push(tableRow.snp);
                                        chromPositionsIncluded.push(tableRow.pos);
                                    }
                                    break;
                                default:
                                    ORs.push(tableRow.oddsRatio);
                                    snpsIncluded.push(tableRow.snp);
                                    chromPositionsIncluded.push(tableRow.pos);
                                    //--------------------------------------//
                                    ORs.push(tableRow.oddsRatio);
                                    snpsIncluded.push(tableRow.snp);
                                    chromPositionsIncluded.push(tableRow.pos);
                            }
                            break;
                        }
                    })
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
        resultJsons.push({ diseaseResults: diseaseResults })
        return JSON.stringify(resultJsons);
    }
};
})
