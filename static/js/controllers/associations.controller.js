const Association = require("../models/association.model.js");

exports.getFromTable = (req, res) => {
    var trait = req.query.trait
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;
    var studyIDs = req.query.studyIDs
    Association.getFromTable(trait, studyIDs, pValue, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving associations"
            });
        }
        else {
            returnData = {}
            res.setHeader('Access-Control-Allow-Origin', '*');
            returnData[trait] = await separateStudies(data, refGen)
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var allTraits = ['alzhimers_disease', 'type_2_diabetes', 'disease-test_1']//req.query.traits;
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;
    Association.getAll(allTraits, pValue, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving associations"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');

            // formating returned data
            traits = {}
            for (i = 0; i < data.length; i++) {
                var associations = data[i]
                traits[allTraits[i]] = await separateStudies(associations, refGen)
            }
            res.send(traits);
        }
    });
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

        if (association.study in studiesAndAssociations) {
            studiesAndAssociations[association.study].push(row)
        }
        else {
            studiesAndAssociations[association.study] = [row]
        }
    }
    return studiesAndAssociations
}