const Association = require("../models/association.model.js");
const path = require("path")
const fs = require("fs")

exports.getFromTables = (req, res) => {
    var studyIDs = req.body.studyIDs
    var pValue = parseFloat(req.body.pValue);
    var refGen = req.body.refGen;

    Association.getFromTables(studyIDs, pValue, refGen, async (err, data) => {
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
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;
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

// gets the last time the associations tsv was updated. Used for the cli to check if the user needs to re-download association data
exports.getLastAssociationsUpdate = (req, res) => {
    associationsPath = path.join(__dirname, '../../..', "tables/associations_table.tsv")
    statsObj = fs.statSync(associationsPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
}

async function separateStudies(associations, traitData, refGen) {
    var studyToTraits = {}
    for (i=0; i < traitData.length; i++) {
        var studyObj = traitData[i]
        if (studyObj.studyID in studyToTraits) {
            studyToTraits[studyObj.studyID].traits.add(studyObj.trait)
            studyToTraits[studyObj.studyID].reportedTraits.add(studyObj.reportedTrait)
        }
        else {
            studyToTraits[studyObj.studyID] = {traits: new Set([studyObj.trait]), reportedTraits: new Set([studyObj.reportedTrait])}
        }
    }

    var studiesAndAssociations = {}
    for (j = 0; j < associations.length; j++) {
        var association = associations[j]
        var row = {
            pos: association[refGen],
            snp: association.snp,
            riskAllele: association.riskAllele,
            pValue: association.pValue,
            oddsRatio: association.oddsRatio
        }

        if (association.studyID in studiesAndAssociations) {
            studiesAndAssociations[association.studyID].associations.push(row)
        }
        else if (!(association.studyID in studyToTraits)){
            console.log(`Study table is missing ${association.studyID}`)
        } 
        else {
            studiesAndAssociations[association.studyID] = {
                citation: association.citation, 
                traits: Array.from(studyToTraits[association.studyID].traits), 
                reportedTraits: Array.from(studyToTraits[association.studyID].reportedTraits),
                associations: [row]
            }
        }
    }

    return studiesAndAssociations
}
