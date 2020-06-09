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
            console.log(`Num associations for trait ${trait}: ${data.length}`)
            returnData[trait] = await separateStudies(data, refGen)
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var allTraits = req.query.traits;
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;
    console.log(`Number of traits: ${allTraits.length}`)
    Association.getAll(allTraits, pValue, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving associations"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            console.log(data)
            // formating returned data
            traits = {}
            if (allTraits.length == 1) {
                console.log(`Num associations for trait ${allTraits[0]}: ${data.length}`)
                traits[allTraits[0]] = await separateStudies(data, refgen)
            }
            else {
                for (i = 0; i < data.length; i++) {
                    var associations = data[i]
                    console.log(`Num associations for trait ${allTraits[i]}: ${associations.length}`)
                    traits[allTraits[i]] = await separateStudies(associations, refGen)
                }
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

        if (association.citation in studiesAndAssociations) {
            studiesAndAssociations[association.citation].associations.push(row)
        }
        else {
            studiesAndAssociations[association.citation] = {studyID: association.studyID, associations: [row]}
        }
    }
    return studiesAndAssociations
}