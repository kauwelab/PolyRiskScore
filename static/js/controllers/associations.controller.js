const Association = require("../models/association.model.js");

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
