const Association = require("../models/association.model.js");
const path = require("path")
const fs = require("fs");
var Request = require('request');

exports.getFromTables = (req, res) => {
    var studyIDObjs = req.body.studyIDObjs
    var refGen = req.body.refGen;
    var sexes = req.body.sexes;
    var ogValueType = req.ogValueType;

    Association.getFromTables(studyIDObjs, refGen, sexes, ogValueType, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            associations = data[0]
            traits = data[1]

            returnData = await separateStudies(associations, traits, refGen)
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var refGen = req.query.refGen;

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

            returnData = await separateStudies(associations, traits, refGen)
            
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
                        key = [data[i][j].trait, data[i][j].studyID, data[i][j].pValueAnnotation, data[i][j].betaAnnotation].join("|")
                        if (!(Object.keys(studyIDTraitsToSnps).includes(key))) {
                            studyIDTraitsToSnps[key] = []
                        }
                        studyIDTraitsToSnps[key].push(data[i][j].snp)
                    }
                }
                else {
                    key=[data[i].trait, data[i].studyID, data[i].pValueAnnotation, data[i].betaAnnotation].join("|")
                    if (!(Object.keys(studyIDTraitsToSnps).includes(key))) {
                        studyIDTraitsToSnps[key] = []
                    }
                    studyIDTraitsToSnps[key].push(data[i].snp)
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

//TODO update these last ones!
// gets the last time the allAssociations file was updated. Used for the cli to check if the user needs to re-download association data
exports.getLastAssociationsUpdate = (req, res) => {
    refGen = req.query.refGen
    sex = req.query.sex

    associationsPath = sex[0].toLowerCase() == "e" ? path.join(__dirname, '../..', `downloadables/associationsAndClumpsFiles/allAssociations_${refGen}.txt`) : path.join(__dirname, '../..', `downloadables/associationsAndClumpsFiles/allAssociations_${refGen}_${sex}.txt`)
    statsObj = fs.statSync(associationsPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
}

//ToDo should probably update this for pvalueAnnotations, and also get rid of sex?
exports.getAssociationsDownloadFile = (req, res) => {
    sex = req.query.sex
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

//TODO should probably update this for pValueAnnotation!!!!!!!
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

async function separateStudies(associations, traitData, refGen, sex) {

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
        pValueAnnotations = [studyObj.pValueAnnotation]
        superPopulations = studyObj.superPopulation.split("|")
        betaAnnotations = [studyObj.betaAnnotation]
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
            
        }
        if (!(studyObj.trait in studyIDsToMetaData[studyObj.studyID]['traits'])) {
            studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait] = {
                studyTypes: traitStudyTypes,
                pValueAnnotations: pValueAnnotations,
                superPopulations: superPopulations,
                betaAnnotations: betaAnnotations
            }
        }
        else { //todo add a condition here that if the trait hasn't been added we can add it back 
            // also change so that pValueAnno is an identifyier? and betaAnno??
            studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait] = {
                //TODO check this, I don't know how the data will actually work with this. 
                studyTypes: Array.from(new Set([...studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait]['studyTypes'], ...traitStudyTypes])),
                pValueAnnotations: Array.from(new Set([...studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait]['pValueAnnotations'], ...pValueAnnotations])),
                superPopulations: Array.from(new Set([...studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait]['superPopulations'], ...superPopulations])),
                betaAnnotations: Array.from(new Set([...studyIDsToMetaData[studyObj.studyID]['traits'][studyObj.trait]['betaAnnotations'], ...betaAnnotations])),
            }
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
        if (association.studyID in studyIDsToMetaData){
            // if the pos/snp does not exist in our map and the studyID is in the associations
            if (!(association.snp in AssociationsBySnp)){
                AssociationsBySnp[association[refGen]] = association.snp // adds the pos to 
                AssociationsBySnp[association.snp] = {
                    pos: association[refGen],
                    traits: {}
                }
            }
            // if the trait is not in the object for the snp
            if (!(association.trait in AssociationsBySnp[association.snp]['traits'])){
                AssociationsBySnp[association.snp]['traits'][association.trait] = {}
            }
            // if the studyID is not in the snp/trait obj
            if (!(association.studyID in AssociationsBySnp[association.snp]['traits'][association.trait])){
                AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = {}
            }
            // if the pValBetaAnno not in the snp/trait/studyID obj
            pValBetaAnno = association.pValueAnnotation + "|" + association.betaAnnotation
            if (!(pValBetaAnno in AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID])){
                AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID][pValBetaAnno] = {}
            }
            // if the valueType not in the snp/trait/studyID/pValBetaAnno obj
            if (!(association.ogValueTypes in AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID][pValBetaAnno])){
                AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID][pValBetaAnno][association.ogValueTypes] = createStudyIDObj(association)
            }
            else {
                console.log("Okay, we have a serious problem...")
                // console.log(association, AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID][pValBetaAnno])
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
        betaValue: association.betaValue,
        betaUnit: association.betaUnit,
        sex: association.sex,
        ogValueTypes: association.ogValueTypes,
    }
}
