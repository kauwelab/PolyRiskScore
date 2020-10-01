const Association = require("../models/association.model.js");

exports.getFromTables = (req, res) => {
    var studyIDs = req.body.studyIDS
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

            returnData = await separateStudies(data, refGen)
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
            returnData = await separateStudies(data, refGen)
            
            res.send(returnData);
        }
    });
}

exports.getAllSnps = (req, res) => {
    var refGen = req.query.refGen; //todo need to put a check here is they don't give it to us
    Association.getAllSnps(refgen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving snps"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // formating returned data
            let testArray = []

            for (i=0; i<data.length; i++) {
                for (j=0; j<data[i].length; j++) {
                    testArray.push(data[i][j])
                }
            }

            console.log(`Total snps: ${testArray.length}`)
            res.send(Array.from(testArray));
        }
    })
}

exports.getSingleSnpFromEachStudy = (req, res) => {
    var refGen = req.query.refGen; //todo need to put a check here is they don't give it to us
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
                for (j = 0; j < data[i].length; j++) {
                    snps.push(data[i][j])
                }
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

async function separateStudies(associations, refGen) {
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
            studiesAndAssociations[association.studyID] = {citation: association.citation, associations: [row]}
        }
    }
    return studiesAndAssociations
}
