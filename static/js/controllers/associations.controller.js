const Association = require("../models/association.model.js");
const path = require("path")
const fs = require("fs");
var Request = require('request');

exports.getFromTables = (req, res) => {
    var studyIDObjs = req.body.studyIDObjs
    var refGen = req.body.refGen;
    var defaultSex = req.body.sex;

    // if not given a defaultSex, default to exclude
    if (defaultSex == undefined){
        defaultSex = "e"
    }

    Association.getFromTables(studyIDObjs, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            associations = data[0]
            traits = data[1]

            returnData = await separateStudies(associations, traits, refGen, defaultSex)
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var refGen = req.query.refGen;
    var defaultSex = req.query.sex;

    // if not given a defaultSex, default to exclude
    if (defaultSex == undefined){
        defaultSex = "e"
    }

    Association.getAll(refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations; ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            associations = data[0]
            traits = data[1]

            returnData = await separateStudies(associations, traits, refGen, defaultSex)
            
            res.send(returnData);
        }
    });
}

exports.getAllSnps = (req, res) => {
    var refGen = req.query.refGen; 
    Association.getAllSnps(refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving snps"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // formating returned data
            let testArray = new Set()

            for (i=0; i<data.length; i++) {
                testArray.add(data[i])
            }

            console.log(`Total snps: ${testArray.size}`)
            res.send(Array.from(testArray));
        }
    })
}

exports.getSnpsToChromPos = (req, res) => {
    var refGen = req.query.refGen;
    var snps = req.query.snps

    Association.getSnpsToChromPos(snps, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving chrom:pos"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            chromPosToSnps = {}
            for (i=0; i<data.length; i++) {
                if (!(Object.keys(chromPosToSnps).includes(data[i].pos))) {
                    chromPosToSnps[data[i].pos] = data[i].snp
                }
            }
            res.send(chromPosToSnps)
        }
    })
}

exports.getAllSnpsToStudyIDs = (req, res) => {
    var refGen = req.query.refGen;
    Association.getAllSnpsToStudyIDs(refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving snps"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            studyIDsToSnps = {}

            for (i=0; i<data.length; i++) {
                if (!(Object.keys(studyIDsToSnps).includes(data[i].studyID))) {
                    studyIDsToSnps[data[i].studyID] = []
                }
                studyIDsToSnps[data[i].studyID].push(data[i].snp)
            }
            res.send(studyIDsToSnps);
        }
    })
}

exports.getSnpsToTraitStudyID = (req, res) => {
    var studyIDObjs = req.body.studyIDObjs

    studyIDTraitsToSnps = {}

    Association.getSnpsToTraitStudyID(studyIDObjs, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            for (i=0; i<data.length; i++) {
                if (Array.isArray(data[i])) {
                    for (j=0; j<data[i].length; j++) {
                        if (!(Object.keys(studyIDTraitsToSnps).includes([data[i][j].trait, data[i][j].studyID].join("|")))) {
                            studyIDTraitsToSnps[[data[i][j].trait, data[i][j].studyID].join("|")] = []
                        }
                        studyIDTraitsToSnps[[data[i][j].trait, data[i][j].studyID].join("|")].push(data[i][j].snp)
                    }
                }
                else {
                    if (!(Object.keys(studyIDTraitsToSnps).includes([data[i].trait, data[i].studyID].join("|")))) {
                        studyIDTraitsToSnps[[data[i].trait, data[i].studyID].join("|")] = []
                    }
                    studyIDTraitsToSnps[[data[i].trait, data[i].studyID].join("|")].push(data[i].snp)
                }
            }
            res.send(studyIDTraitsToSnps);
        }
    });
}

exports.getSingleSnpFromEachStudy = (req, res) => {
    var refGen = req.query.refGen;
    Association.getSingleSnpFromEachStudy(refGen, (err,data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving snps"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            snps = []
            for (i = 0; i < data.length; i++) {
                snps.push(data[i])
            }
            console.log("single snp from each study: 1 shown", snps[0])
            res.send(snps);
        }
    })
}

exports.searchMissingRsIDs = (req, res) => {
    Association.searchMissingRsIDs((err,data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving snps"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // formating returned data
            console.log("Printing first line of data", data[0])
            res.send(data);
        }
    })
}

exports.snpsByEthnicity = (req, res) => {
    var ethnicities = req.query.ethnicities
    Association.snpsByEthnicity(ethnicities, (err,data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving snps"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // formating returned data
            res.send(data);
        }
    })
}

exports.joinTest = (req, res) => {
    Association.joinTest((err,data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving join"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // formating returned data
            res.send(data);
        }
    })
}

// gets the last time the allAssociations file was updated. Used for the cli to check if the user needs to re-download association data
exports.getLastAssociationsUpdate = (req, res) => {
    refGen = req.query.refGen
    sex = req.query.defaultSex

    associationsPath = path.join(__dirname, '../..', `downloadables/associationsAndClumpsFiles/allAssociations_${refGen}_${sex}.txt`)
    statsObj = fs.statSync(associationsPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
}

exports.getAssociationsDownloadFile = (req, res) => {
    sex = req.query.defaultSex
    refGen = req.query.refGen
    downloadPath = path.join(__dirname, '../..', 'downloadables', 'associationsAndClumpsFiles')
    var options = { 
        root: downloadPath
    };
    var fileName = (sex[0].toLowerCase() == "e" ? `allAssociations_${refGen}.txt` : `allAssociations_${refGen}_${sex}.txt`); 
    res.sendFile(fileName, options, function (err) { 
        if (err) { 
            console.log(err); 
            res.status(500).send({
                message: "Error finding file"
            });
        } else { 
            console.log('Sent:', fileName); 
        } 
    }); 
}

exports.getTraitStudyIDToSnpsDownloadFile = (req, res) => {
    downloadPath = path.join(__dirname, '../..', 'downloadables', 'associationsAndClumpsFiles')
    var options = { 
        root: downloadPath
    };
    var fileName = `traitStudyIDToSnps.txt`; 
    res.sendFile(fileName, options, function (err) { 
        if (err) { 
            console.log(err); 
            res.status(500).send({
                message: "Error finding file"
            });
        } else { 
            console.log('Sent:', fileName); 
        } 
    });
}

async function separateStudies(associations, traitData, refGen, defaultSex) {

    // store the citation and reported trait for each study
    var studyIDsToMetaData = {}
    for (i=0; i < traitData.length; i++) {
        var studyObj = traitData[i]
        traitStudyTypes = []
        if (studyObj.hi != "") {
            traitStudyTypes.push(studyObj.hi)
        }
        if (studyObj.lc != "") {
            traitStudyTypes.push(studyObj.lc)
        }
        if (traitStudyTypes.length == 0) {
            traitStudyTypes.push("O")
        }
        ethnicities = studyObj.ethnicity.replace(" or ", "|").split("|")
        if (!(studyObj.studyID in studyIDsToMetaData)) {
            studyTypes = []
            if (studyObj.rthi != ""){
                studyTypes.push(studyObj.rthi)
            }
            if (studyObj.rtlc != "") {
                studyTypes.push(studyObj.rtlc)
            }
            if (studyTypes.length == 0) {
                studyTypes.push("O")
            }
            studyIDsToMetaData[studyObj.studyID] = { citation: studyObj.citation, reportedTrait: studyObj.reportedTrait, studyTypes: studyTypes, traits: {}, ethnicity: ethnicities != "" ? ethnicities : []}
            studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait] = traitStudyTypes
        }
        else {
            studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait] = traitStudyTypes
            studyIDsToMetaData[studyObj.studyID]['ethnicity'] = Array.from(new Set([...studyIDsToMetaData[studyObj.studyID]['ethnicity'], ...ethnicities]))
        }
    }

    var AssociationsBySnp = {}

    //checks to see if the first item in the array is an array, if so, it merges nested arrays into a single array
    if (Array.isArray(associations[0])) {
        var associations = [].concat.apply([], associations);
    }

    // array of info for the snps that are duplicated
    arrayOfDupliSnpsInfo = []
    // array of info for snps that might be duplicated, but we don't know for certain at the time
    potentialDupliSnpsInfo = []

    // format the associations with rsIDs (and positions) as keys
    for (j = 0; j < associations.length; j++) {
        var association = associations[j]
        // if the pos/snp already exists in our map
        if (association.snp in AssociationsBySnp){
            // if the trait already exists for the pos/snp
            if (association.trait in AssociationsBySnp[association.snp]['traits']){
                // if the studyID already exists for the pos/snp - trait, check if we should replace the current allele/oddsRatio/pValue or if we should remove it
                if (association.studyID in AssociationsBySnp[association.snp]['traits'][association.trait]){
                    // if not already included in the arrayOfDupliSnpsInfo, add it
                    if (!arrayOfDupliSnpsInfo.includes([association.snp, association.trait, association.studyID].toString())) {
                        arrayOfDupliSnpsInfo.push([association.snp, association.trait, association.studyID].toString())
                    }

                    // if association.sex and defaultSex match, replace the association
                    if (association.sex[0].toLowerCase() == defaultSex[0].toLowerCase()) {
                        AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
                    }
                    // otherwise, delete the association entirely
                    else {
                        delete AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID]
                    }

                    //Add an indication of which traits/studies have duplicated snps
                    if (!('traitsWithExcludedSnps' in studyIDsToMetaData[association.studyID])) {
                        studyIDsToMetaData[association.studyID]['traitsWithExcludedSnps'] = [association.trait]
                    }
                    else if (!(studyIDsToMetaData[association.studyID]['traitsWithExcludedSnps'].includes(association.trait))) {
                    }
                }
                else {
                    // if the current allele/oddsRatio/pValue is not in the array of duplicate snps
                    if (!arrayOfDupliSnpsInfo.includes([association.snp, association.trait, association.studyID].toString())) {
                        // if the sex is nothing or it matches the asked for sex
                        if (association.sex == "NA" || association.sex[0].toLowerCase() == defaultSex[0].toLowerCase()) {
                            // if the current allele/oddsRatio/pValue is in the potentialDupliSnpsInfo, add it to the arrayOfDupliSnpsInfo
                            if (potentialDupliSnpsInfo.includes([association.snp, association.trait, association.studyID].toString())) {
                                arrayOfDupliSnpsInfo.push([association.snp, association.trait, association.studyID].toString())
                            }
                            // add the studyID and data
                            AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
                        }
                        // if the association is the wrong sex (or we are excluding all sex based associations)
                        else {
                            // add the current allele/oddsRatio/pValue to potentialDupliSnpsInfo
                            potentialDupliSnpsInfo.push([association.snp, association.trait, association.studyID].toString())
                            //Add an indication of which traits/studies have duplicated snps
                            if (!('traitsWithExcludedSnps' in studyIDsToMetaData[association.studyID])) {
                                studyIDsToMetaData[association.studyID]['traitsWithExcludedSnps'] = [association.trait]
                            }
                        }
                    }
                }
            }
            else {
                // add the trait and studyID data
                if (association.sex == "NA" || association.sex[0].toLowerCase() == defaultSex[0].toLowerCase()) {
                    AssociationsBySnp[association.snp]['traits'][association.trait] = {}
                    AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
                }
                else {
                    potentialDupliSnpsInfo.push([association.snp, association.trait, association.studyID])
                }
            }
        }
        // else add the pos->trait->studyID 
        else if (association.studyID in studyIDsToMetaData){
            // if there is no sex associated with the odds ratio or if the sex is the same as the requested sex (defaultSex)
            if (association.sex == "NA" || association.sex[0].toLowerCase() == defaultSex[0].toLowerCase()) {
                AssociationsBySnp[association.snp] = {
                    pos: association[refGen],
                    traits: {}
                }
                AssociationsBySnp[association.snp]['traits'][association.trait] = {}
                AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
                //adds the position as a key to an rsID, if needed
                if (association[refGen] != ""){
                    AssociationsBySnp[association[refGen]] = association.snp
                }
            }
            // if it did not pass the sex comparison, then it might be a potentially duplicated snp
            else {
                potentialDupliSnpsInfo.push([association.snp, association.trait, association.studyID])
            }
        }
        else {
            console.log("Not in studyIDsToMetaData", association.studyID)
        }
    }

    returnObject = {
        studyIDsToMetaData: studyIDsToMetaData,
        associations: AssociationsBySnp
    }

    return returnObject
}

function createStudyIDObj(association){
    return {
        riskAllele: association.riskAllele,
        pValue: association.pValue,
        oddsRatio: association.oddsRatio,
        sex: association.sex,
    }
}
