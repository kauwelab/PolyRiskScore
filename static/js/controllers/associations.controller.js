const Association = require("../models/association.model.js");
const path = require("path")
const fs = require("fs")

exports.getFromTables = (req, res) => {
    var studyIDObjs = req.body.studyIDObjs
    var pValue = parseFloat(req.body.pValue);
    var refGen = req.body.refGen;
    var defaultSex = req.body.sex;
    var isVCF = req.body.isVCF;

    // if not given a defaultSex, default to female
    if (defaultSex == undefined){
        defaultSex = "f"
    }

    Association.getFromTables(studyIDObjs, pValue, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            associations = data[0]
            traits = data[1]

            returnData = await separateStudies(associations, traits, refGen, defaultSex, isVCF)
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;
    var defaultSex = req.query.sex;
    var isVCF = req.query.isVCF;

    // if not given a defaultSex, default to female
    if (defaultSex == undefined){
        defaultSex = "f"
    }

    Association.getAll(pValue, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving associations; ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            associations = data[0]
            traits = data[1]

            returnData = await separateStudies(associations, traits, refGen, defaultSex, isVCF)
            
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

// gets the last time the associations tsv was updated. Used for the cli to check if the user needs to re-download association data
exports.getLastAssociationsUpdate = (req, res) => {
    associationsPath = path.join(__dirname, '../../..', "tables/associations_table.tsv")
    statsObj = fs.statSync(associationsPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
}

async function separateStudies(associations, traitData, refGen, sex, isVCF) {

    // if isVCF, we want to add postions as keys to rsIDs
    addPosKeys = (isVCF.toLowerCase() == 'true')

    // store the citation and reported trait for each study
    var studyIDsToMetaData = {}
    for (i=0; i < traitData.length; i++) {
        var studyObj = traitData[i]
        if (!(studyObj.studyID in studyIDsToMetaData)) {
            studyIDsToMetaData[studyObj.studyID] = { citation: studyObj.citation, reportedTrait: studyObj.reportedTrait}
        }
    }

    var AssociationsBySnp = {}

    //checks to see if the first item in the array is an array, if so, it merges nested arrays into a single array
    if (Array.isArray(associations[0])) {
        var associations = [].concat.apply([], associations);
    }

    // format the associations with rsIDs (and positions) as keys
    for (j = 0; j < associations.length; j++) {
        var association = associations[j]
        // if the pos/snp already exists in our map
        if (association.snp in AssociationsBySnp){
            // if the trait already exists for the pos/snp
            if (association.trait in AssociationsBySnp[association.snp]['traits']){
                // if the studyID already exists for the pos/snp - trait, check if we should replace the current allele/oddsRatio/pValue
                if (association.studyID in AssociationsBySnp[association.snp]['traits'][association.trait]){
                    var replace = compareDuplicateAssociations(AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID], association, sex)
                    if (replace) {
                        AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
                    }
		    //Add an indication of which traits/studies have duplicated snps
                    if (!('traitsWithDuplicateSnps' in studyIDsToMetaData[association.studyID])) {
                        studyIDsToMetaData[association.studyID]['traitsWithDuplicateSnps'] = [association.trait]
                    }
                    else if (!(studyIDsToMetaData[association.studyID]['traitsWithDuplicateSnps'].includes(association.trait))) {
                        studyIDsToMetaData[association.studyID]['traitsWithDuplicateSnps'].push(association.trait)
                    }
                }
                else {
                    // add the studyID and data
                    AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
                }
            }
            else {
                // add the trait and studyID data
                AssociationsBySnp[association.snp]['traits'][association.trait] = {}
                AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
            }
        }
        // else add the pos->trait->studyID 
        else if (association.studyID in studyIDsToMetaData){
            AssociationsBySnp[association.snp] = {
                pos: association[refGen],
                traits: {}
            }
            AssociationsBySnp[association.snp]['traits'][association.trait] = {}
            AssociationsBySnp[association.snp]['traits'][association.trait][association.studyID] = createStudyIDObj(association, studyIDsToMetaData[association.studyID])
            //adds the position as a key to an rsID, if needed
            if (addPosKeys){
                AssociationsBySnp[association[refGen]] = association.snp
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

// if returns true: replace oldAssoci with newAssoci, if returns false: keep the oldAssoci
function compareDuplicateAssociations(oldAssoci, newAssoci, defaultSex) {
    oldAssociScore = getSexScore(oldAssoci.sex, defaultSex)
    newAssociScore = getSexScore(newAssoci.sex, defaultSex)

    // if associ2 has a better score, replace associ1
    if (oldAssociScore < newAssociScore){
        return true
    }
    // if associ1 has a better score, keep associ1
    else if (oldAssociScore > newAssociScore){
        return false
    }
    // if the two have equal scores
    else {
        // compare their pValues. keep the one with the most significant (lowest) pValue
        switch(oldAssoci.pValue <= newAssoci.pvalue){
            // keep associ1
            case true:
                return false;
            // replace associ1 with associ2
            default:
                return true;
        }
    }
}

// creates a way to compare associations by sex
// if the association doesn't have anything in the sex column, we want to prefer that association so we give it a higher score
// if the association sex matches the defaultSex, we prefer that over not matching but we prefer that less than the association being 'sex free'
function getSexScore(sex, defaultSex) {
    switch(sex[0]){
        case "": 
            return 3;
        case defaultSex[0]:
            return 2;
        default:
            return 1;
    }
}
