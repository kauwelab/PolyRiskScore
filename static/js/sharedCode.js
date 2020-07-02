(function (exports) {
    //a "map" of diseases to their respective studies. Made global for easy access
    //TODO soon to be replaced by a database query to study_table and trait_table
    var diseasesAndStudies = {};
    diseasesAndStudies['all'] = ['High Impact', 'Largest Cohort'];
    diseasesAndStudies['adhd'] = ['Demontis et al. 2018', 'Hawi et al. 2018', 'Hinney et al. 2011', 'Mick et al. 2010',
        'Stergiakouli et al. 2012', 'Zayats et al. 2015'];
    diseasesAndStudies['ad'] = ['Lambert et al. 2013 (High Impact)', 'Lee et al. 2010', 'Mez et al. 2017', 'Miyashita et al. 2013',
        'Moreno et al. 2017', 'Naj et al. 2011 (Joint)', 'Naj et al. 2011 (Meta)', 'Reitz et al. 2013'];
    diseasesAndStudies['als'] = ['Ahmeti et al. 2012 (Joint)', 'Ahmeti et al. 2012 (Meta)', 'Diekstra et al. 2014', 'Laaksovirta et al. 2010',
        'Landers et al. 2009', 'van Es MA et al. 2007', 'van Rheenen W et al. 2016 (High Impact)'];
    diseasesAndStudies['dep'] = ['Ripke et al. 2012 (High Impact)', 'Wray et al. 2018 (Largest Cohort)'];
    diseasesAndStudies['coronary_heart_disease'] = ['Coronary Artery Disease (C4D) Genetics Consortium 2011', 'Samani NJ 2007', 'Schunkert H 2011',
        'Wild PS 2011'];
    diseasesAndStudies['hf'] = ['Shah et. al 2020'];
    diseasesAndStudies['t1d'] = ['Todd JA 2007', 'Wellcome Trust Case Control Consortium 2007', 'Hakonarson H 2007', 'Grant SF 2008',
        'Cooper JD 2008', 'Barrett JC 2009', 'Plagnol V 2011', 'Tomer Y 2015', 'Onengut-Gumuscu S 2015', 'Sharma A 2018', 'Charmet R 2018',
        'Kawabata Y 2018', 'Zhu M 2019'];
    diseasesAndStudies['t2d'] = ['Mahajan A 2018', 'Scott LJ 2007', 'Zeggini E 2007', 'Saxena R 2007', 'Wellcome Trust Case Control Consortium 2007',
        'Zeggini E 2008', 'Takeuchi F 2009', 'Rung J 2009', 'Voight BF 2010', 'Shu XO 2010', 'Sim X 2011', 'Parra EJ 2011', 'Kooner JS 2011',
        'Cho YS 2011', 'Palmer ND 2012', 'Perry JR 2012', 'Li H 2012', 'Tabassum R 2012', 'Saxena R 2013', 'Hara K 2013', 'Mahajan A 2014',
        'Ng MC 2014', 'Ghassibe-Sabbagh M 2014', 'Huang KC 2015', 'Imamura M 2016', 'Cook JP 2016', 'Qi Q 2017', 'Scott RA 2017',
        'Zhao W 2017', 'Morris AP 2012', 'Bonàs-Guarch S 2018', 'Domínguez-Cruz MG 2018', 'Wood AR 2016', 'Xue A 2018', 'Suzuki K 2019',
        'Chen J 2019', 'Flannick J 2019', 'Mahajan A 2018'];

    //freeze the object so it can't be edited by the browser or server
    diseasesAndStudies = Object.freeze(diseasesAndStudies);

    /**
     * Rurns the diseasesAndStudies object
     * TODO soon to be removed
     */
    exports.getDiseasesAndStudiesObj = function () {
        return diseasesAndStudies
    }

    /**
     * Gets the studies associated with the specified disease and study type list from the diseasesAndStudies object
     * @param {*} disease 
     * @param {*} studyTypeList 
     */
    function getStudiesFromDisease(disease, studyTypeList) {
        disease = disease.toLowerCase();
        if (disease in diseasesAndStudies) {
            var possibleStudies = diseasesAndStudies[disease];
            var relevantStudies = []
            //for each study in the possibleStudies list, determine if it fits the requested studyTypeList, 
            //remove the string that identifies it's type and (if the study is not empty) add it to the 
            //relevantStudies list
            //TODO clean this up to work better for a list of study types
            possibleStudies.forEach(function (study) {
                if (studyTypeList.includes("high impact")) {
                    if (study.toLowerCase().includes("high impact")) {
                        study = getStudyNameFromStudyEntry(study);
                        if (study != "") {
                            relevantStudies.push(study);
                        }
                    }
                }
                else if (studyTypeList.includes("largest cohort")) {
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
        return [];
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
     * studyTypeList narrows down what studies are searched.
     * @param {*} diseaseArray an array of diseases for which the user wants the risk scores to be calculated.
     * @param {*} studyTypeList can be contain "high impact", "largest cohort", or "". If "", all studies for each disease are returned in the object.
     */
    exports.makeDiseaseStudyMapArray = function (diseaseArray, studyTypeList) {
        var diseaseStudyMapArray = [];
        //if the user doesn't specify any diseases, do all of them
        if (diseaseArray == undefined || diseaseArray.length <= 0) {
            diseaseArray = [];
            for (var diseaseName in diseasesAndStudies) {
                if (diseaseName.toLowerCase() !== "all") {
                    if (diseasesAndStudies.hasOwnProperty(diseaseName)) {
                        diseaseArray.push(diseaseName);
                    }
                }
            }
        }
        //else, make the diseaseStudyMapArray based on their disease list
        diseaseArray.forEach(function (disease) {
            var studies = getStudiesFromDisease(disease, studyTypeList)
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
    //TODO redo
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
                    //usefulPos. Each databasePosObj contains: snp, pos, oddsRatio, allele, study, and disease
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

                var diseaseResults = [];
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
                                study: citation,
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
                    diseaseResults.push({
                        //TODO format trait for result here
                        disease: trait,
                        studyResults: studyResults
                    });
                });
                //create a new JSON object containing the individual name followed by their trait results list
                resultJsons.push({ individualName: this.trim(individualName), diseaseResults: diseaseResults })
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
     * {snp, pos, oddsRatio, allele, study, disease}. Whethere the keys are pos or snpIDs depends on the "isPosBased boolean." 
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
                        disease: trait
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
