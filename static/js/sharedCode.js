(function (exports) {
    //a "map" of diseases to their respective studies. Made global for easy access
    var diseasesAndStudies = {};
    diseasesAndStudies['ALL'] = ['High Impact','Largest Cohort'];
    diseasesAndStudies['ADHD'] = ['Demontis et al. 2018','Hawi et al. 2018','Hinney et al. 2011','Mick et al. 2010',
        'Stergiakouli et al. 2012','Zayats et al. 2015'];
    diseasesAndStudies['AD'] = ['Lambert et al. 2013 (High Impact)','Naj et al. 2011','Largest Cohort'];
    diseasesAndStudies['ALS'] = ['Ahmeti KB 2012','Diekstra FP 2014','Landers JE 2009','van Rheenen W 2016 (High Impact)'];
    diseasesAndStudies['DEP'] = ['Ripke et al. 2012 (High Impact)','Wray et al. 2018 (Largest Cohort)'];
    diseasesAndStudies['CHD'] = ['Coronary Artery Disease (C4D) Genetics Consortium 2011','Samani NJ 2007','Schunkert H 2011',
        'Wild PS 2011'];
    diseasesAndStudies['HF'] = ['Shah et. al 2020'];
    diseasesAndStudies['T1D'] = ['Todd JA 2007','Wellcome Trust Case Control Consortium 2007','Hakonarson H 2007','Grant SF 2008',
        'Cooper JD 2008','Barrett JC 2009','Plagnol V 2011','Tomer Y 2015','Onengut-Gumuscu S 2015','Sharma A 2018','Charmet R 2018',
        'Kawabata Y 2018','Zhu M 2019'];
    diseasesAndStudies['T2D'] = ['Mahajan A 2018','Scott LJ 2007','Zeggini E 2007','Saxena R 2007','Wellcome Trust Case Control Consortium 2007',
        'Zeggini E 2008','Takeuchi F 2009','Rung J 2009','Voight BF 2010','Shu XO 2010','Sim X 2011','Parra EJ 2011','Kooner JS 2011',
        'Cho YS 2011','Palmer ND 2012','Perry JR 2012','Li H 2012','Tabassum R 2012','Saxena R 2013','Hara K 2013','Mahajan A 2014',
        'Ng MC 2014','Ghassibe-Sabbagh M 2014','Huang KC 2015','Imamura M 2016','Cook JP 2016','Qi Q 2017','Scott RA 2017',
        'Zhao W 2017','Morris AP 2012','Bonàs-Guarch S 2018','Domínguez-Cruz MG 2018','Wood AR 2016','Xue A 2018','Suzuki K 2019',
        'Chen J 2019','Flannick J 2019','Mahajan A 2018'];

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
 * Calculates the polygenetic risk score using table rows from the database and the textSnps.
 * If the textSnps is undefined, throws an error message that can be printed to the user.
 * P-value is required so the result can also return information about the calculation.
 * @param {*} tableObj 
 * @param {*} textSnps 
 * @param {*} pValue 
 * @return a string in JSON format of the calculated score and other information about it.
 */
    exports.calculateScoreFromText = function (tableObj, textSnps, pValue) {
        var resultJsons = [];
        if (textSnps == undefined) {
            throw "The snps were undefined when calculating the score. Please retype the snps or choose a vcf."
        }
        else {
            //push information about the calculation to the result
            resultJsons.push({ pValueCutoff: pValue, totalVariants: textSnps.size })
            //for each individual and each disease and each study in each disease and each snp of each individual, 
            //calculate scores and push results and relevant info to objects that are added to the diseaseResults array

            var diseaseResults = [];
            tableObj.forEach(function (diseaseEntry) {
                var studyResults;
                studyResults = [];
                diseaseEntry.studiesRows.forEach(function (studyEntry) {
                    var ORs = []
                    var snpsIncluded = [];
                    var chromPositionsIncluded = []
                    textSnps.forEach(function (value, key) {
                        studyEntry.rows.forEach(function (tableRow) {
                            if (tableRow.snp === key) {
                                switch (value.length) {
                                    case 2:
                                        if (value[0] === tableRow.riskAllele) {
                                            ORs.push(tableRow.oddsRatio);
                                            snpsIncluded.push(tableRow.snp);
                                            chromPositionsIncluded.push(tableRow.pos);
                                        }
                                        if (value[1] === tableRow.riskAllele) {
                                            ORs.push(tableRow.oddsRatio);
                                            snpsIncluded.push(tableRow.snp);
                                            chromPositionsIncluded.push(tableRow.pos);
                                        }
                                        break;
                                    case 1:
                                        if (value[0] === tableRow.riskAllele) {
                                            ORs.push(tableRow.oddsRatio);
                                            snpsIncluded.push(tableRow.snp);
                                            chromPositionsIncluded.push(tableRow.pos);
                                        }
                                        ORs.push(tableRow.oddsRatio);
                                        snpsIncluded.push(tableRow.snp);
                                        chromPositionsIncluded.push(tableRow.pos);
                                        break;
                                    default:
                                        ORs.push(tableRow.oddsRatio);
                                        snpsIncluded.push(tableRow.snp);
                                        chromPositionsIncluded.push(tableRow.pos);

                                        ORs.push(tableRow.oddsRatio);
                                        snpsIncluded.push(tableRow.snp);
                                        chromPositionsIncluded.push(tableRow.pos);
                                        break;
                                }
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
            resultJsons.push({ individualName: 'textInputResults', diseaseResults: diseaseResults })
            return JSON.stringify(resultJsons);
        }
    };

    /**
     * Calculates the polygenetic risk score using table rows from the database and the vcfObj.
     * If the vcfObj is undefined, throws an error message that can be printed to the user.
     * P-value is required so the result can also return information about the calculation.
     * @param {*} tableObj 
     * @param {*} vcfObj 
     * @param {*} pValue 
     * @return a string in JSON format of each idividual, their scores, and other information about their scores.
     */
    exports.calculateScore = function (tableObj, vcfObj, pValue, usefulPos) {
        var resultJsons = [];
        if (vcfObj == undefined || vcfObj.size <= 0) {
            throw "The vcf was undefined when calculating the score. Please choose a different vcf or reload the page and try again."
        }
        else {
            //push information about the calculation to the result
            resultJsons.push({ pValueCutoff: pValue, totalVariants: Array.from(vcfObj.entries())[0][1].length })

            //for each individual, get a map containing all studies to the oddsRatios, snps and pos associated to each study and individual
            //then convert this map into the right format for results
            for (const [individualName, individualSNPObjs] of vcfObj.entries()) {
                //key value pairs- study:{oddsRatios, snps, pos}
                var studyObjs = new Map();
                individualSNPObjs.forEach(function (individualSNPObj) {
                    var databasePosObj = Array.from(usefulPos.get(individualSNPObj.pos))[0]
                    var oddsRatioTempList = [];
                    var snpTempList = [];
                    var posTempList = [];
                    individualSNPObj.alleleArray.forEach(function (allele) {
                        if ((allele !== null && databasePosObj.allele === allele) || allele == null) {
                            oddsRatioTempList.push(databasePosObj.oddsRatio)
                            snpTempList.push(databasePosObj.snp)
                            //the individualSNPObj.pos here is the same as databasePosObj, the databasePosObj just doesn't have pos as a value because pos was used as it's key in a set
                            posTempList.push(individualSNPObj.pos)
                        }
                    });
                    if (studyObjs.has(databasePosObj.study)) {
                        var studyObj = studyObjs.get(databasePosObj.study);
                        studyObj.oddsRatios.concat(oddsRatioTempList);
                        studyObj.snps.concat(snpTempList);
                        studyObj.pos.concat(posTempList);
                        studyObjs.set(databasePosObj.study, studyObj)
                    }
                    else {
                        var studyObj = {
                            oddsRatios: oddsRatioTempList,
                            snps: snpTempList,
                            pos: posTempList
                        }
                        studyObjs.set(databasePosObj.study, studyObj)
                    }
                });

                var diseaseResults = [];
                tableObj.forEach(function (diseaseEntry) {
                    var studyResults = [];
                    diseaseEntry.studiesRows.forEach(function (studyEntry) {
                        if (studyObjs.has(studyEntry.study)) {
                            studyResults.push({
                                study: studyEntry.study,
                                oddsRatio: getCombinedORFromArray(studyObjs.get(studyEntry.study).oddsRatios),
                                percentile: "",
                                numSNPsIncluded: studyObjs.get(studyEntry.study).snps.length,
                                chromPositionsIncluded: studyObjs.get(studyEntry.study).pos,
                                snpsIncluded: studyObjs.get(studyEntry.study).snps
                            });
                        }
                        else {
                            studyResults.push({
                                study: studyEntry.study,
                                oddsRatio: 1,
                                percentile: "",
                                numSNPsIncluded: 0,
                                chromPositionsIncluded: [],
                                snpsIncluded: []
                            });
                        }
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
     * Gets a map of pos/snp -> {snp, pos, oddsRatio, allele, study, disease}
     * The keys depend on the "isPosBased boolean." If isPosBased is true, the keys are pos, otherwise they are snp ids
     */
    exports.getIdentifierMap = function (tableObj, isPosBased) {
        var usefulIdentifiers = new Map()
        for (let i = 0; i < tableObj.length; ++i) {
            for (let j = 0; j < tableObj[i].studiesRows.length; ++j) {
                for (let k = 0; k < tableObj[i].studiesRows[j].rows.length; ++k) {
                    var identifier = "";
                    if (isPosBased) {
                        identifier = tableObj[i].studiesRows[j].rows[k].pos;
                    }
                    else {
                        identifier = tableObj[i].studiesRows[j].rows[k].snp;
                    }
                    var indentifierObj = {
                        snp: tableObj[i].studiesRows[j].rows[k].snp,
                        pos: tableObj[i].studiesRows[j].rows[k].pos,
                        oddsRatio: tableObj[i].studiesRows[j].rows[k].oddsRatio,
                        allele: tableObj[i].studiesRows[j].rows[k].riskAllele,
                        study: tableObj[i].studiesRows[j].study,
                        disease: tableObj[i].disease
                    }
                    if (usefulIdentifiers.has(identifier)) {
                        usefulIdentifiers.set(identifier, usefulIdentifiers.get(identifier).add(indentifierObj));
                    }
                    else {
                        usefulIdentifiers.set(identifier, new Set([indentifierObj]));
                    }
                }
            }
        }
        return usefulIdentifiers;
    }

})(typeof exports === 'undefined' ? this['sharedCode'] = {} : exports);