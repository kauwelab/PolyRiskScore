const Association = require("../models/association.model.js");

exports.getFromTables = (req, res) => {
    //traits format :: [{trait: trait, studyIDs: [list of studyIDs]}, {trait: trait, studyIDs: [list of studyIDs]}]
    var traits = JSON.parse(req.body.traits)
    var pValue = parseFloat(req.body.pValue);
    var refGen = req.body.refGen;

    Association.getFromTables(traits, pValue, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving associations"
            });
        }
        else {
            returnData = {}
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (traits.length == 1){
                returnData[traits[0].trait] = await separateStudies(data, refGen)
            }
            else {
                for (i=0; i<data.length; i++) {
                    var associations = data[i]
                    console.log(`Num associations for trait ${traits[i].trait}: ${associations.length}`)
                    returnData[traits[i].trait] = await separateStudies(associations, refGen)
                }
            }
            res.send(returnData);
        }
    });
};

exports.getAll = (req, res) => {
    var allTraits = req.query.traits;
    if (typeof(allTraits) == "string") {
	    allTraits = [allTraits]
    }
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
            // formating returned data
            traits = {}
            if (allTraits.length == 1) {
                console.log(`Num associations for trait ${allTraits[0]}: ${data.length}`)
                traits[allTraits[0]] = await separateStudies(data, refGen) 
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

exports.getAllSnps = (req, res) => {
    Association.getAllSnps((err, data) => {
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
    Association.getSingleSnpFromEachStudy((err,data) => {
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
