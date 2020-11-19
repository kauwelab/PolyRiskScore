const Association = require("../models/association.model.js");
const path = require("path")
const fs = require("fs")

exports.getFromTables = (req, res) => {
    var studyIDObjs = req.body.studyIDObjs
    var pValue = parseFloat(req.body.pValue);
    var refGen = req.body.refGen;
    var defaultPop = req.body.population;
    var defaultSex = req.body.sex;
    var isPosBased = req.body.isPosBased;

    // if not given a sex, default to female
    if (defaultSex == undefined){ //check this
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

            // returnData is a list [studyIDsToMetaData, AssociationsByPos]
            returnData = await separateStudies(associations, traits, refGen, defaultPop, defaultSex, isPosBased)
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;
    var defaultPop = req.body.population;
    var defaultSex = req.body.sex;
    var isPosBased = req.body.isPosBased;

    // if not given a sex, default to female
    if (defaultSex == undefined){ //check this
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
            // returnData is a list [studyIDsToMetaData, AssociationsByPos]
            returnData = await separateStudies(associations, traits, refGen, defaultPop, defaultSex, isPosBased)
            
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
            console.log(data)
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
            console.log(data)
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

async function separateStudies(associations, traitData, refGen, population, sex, isPosBased) {

    ident = (isPosBased) ? refGen : 'snp'

    var studyIDsToMetaData = {}
    for (i=0; i < traitData.length; i++) {
        var studyObj = traitData[i]
        if (studyObj.studyID in studyIDsToMetaData) {
            studyIDsToMetaData[studyObj.studyID] = { citation: studyObj.citation, reportedTrait: studyObj.reportedTrait}
        }
        else {
            studyIDsToMetaData[studyObj.studyID] = {}
            studyIDsToMetaData[studyObj.studyID] = { citation: studyObj.citation, reportedTrait: studyObj.reportedTrait}
        }
    }

    var AssociationsByPos = {}
    for (j = 0; j < associations.length; j++) {
        var association = associations[j]
        // if the pos/snp already exists in our map
        if (association[ident] in AssociationsByPos){
            // if the trait already exists for the pos/snp
            if (association.trait in AssociationsByPos[ident].traits){
                // if the studyID already exists for the pos/snp - trait, check if we should replace the current allele/oddsRatio/pValue
                if (association.studyID in AssociationsByPos[ident].traits[association.trait]){
                    var replace = compareDuplicateAssociations(AssociationsByPos[ident].traits[association.trait][association.studyID], association, population, sex)
                    if (replace) {
                        AssociationsByPos[ident].traits[association.trait][association.studyID] = createStudyIDObj(association)
                    }
                }
                else {
                    // add the studyID and data
                    AssociationsByPos[ident].traits[association.trait][association.studyID] = createStudyIDObj(association)
                }
            }
            else {
                // add the trait and studyID data
                AssociationsByPos[ident].traits[association.trait] = {}
                AssociationsByPos[ident].traits[association.trait][association.studyID] = createStudyIDObj(association)
            }
        }
        // else add the pos->trait->studyID 
        else {
            AssociationsByPos[association[ident]] = {
                snp: association.snp,
                pos: association[refGen],
                traits: {}
            }
            AssociationsByPos[association[ident]].traits[association.trait] = {}
            AssociationsByPos[association[ident]].traits[association.trait][association.studyID] = createStudyIDObj(association)
        }
    }

    return [studyIDsToMetaData, AssociationsByPos]
}

function createStudyIDObj(association){
    return {
        riskAllele: association.riskAllele,
        pValue: association.pValue,
        oddsRatio: association.oddsRatio,
        sex: association.sex,
        pop: association.population
    }
}

// true is replace, false is keep
function compareDuplicateAssociations(oldAssoci, newAssoci, defaultPop, defaultSex) {
    oldAssociScore = getPopScore(oldAssoci.population, defaultPop) + getSexScore(oldAssoci.sex, defaultSex)
    newAssociScore = getPopScore(newAssoci.population, defaultPop) + getSexScore(newAssoci.sex, defaultSex)

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

const popMapping = {
    "AFR": [ "AFR", "SAS", "EAS", "AMR", "EUR" ],
    "AMR": [ "AMR", "EUR", "SAS", "EAS", "AFR" ],
    "EAS": [ "EAS", "SAS", "EUR", "AMR", "AFR" ],
    "EUR": [ "EUR", "AMR", "SAS", "EAS", "AFR" ],
    "SAS": [ "SAS", "EAS", "EUR", "AMR", "AFR" ]
}

function getPopScore(pop, defaultPop) {
    popArray = popMapping[defaultPop]

    switch(pop) {
        case "": 
            return 60;
        case popArray[0]:
            return 50;
        case popArray[1]:
            return 40;
        case popArray[2]:
            return 30;
        case popArray[3]:
            return 20;
        case popArray[4]:
            return 10;
        default:
            return 0;
    }
}

function getSexScore(sex, defaultSex) {
    switch(sex){
        case "": 
            return 3;
        case defaultSex:
            return 2;
        default:
            return 1;
    }
}