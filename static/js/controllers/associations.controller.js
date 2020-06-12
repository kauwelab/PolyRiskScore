const Association = require("../models/association.model.js");

exports.getFromTable = (req, res) => {
    //traits format :: {trait: trait, studyIDs: [list of studyIDs], trait: trait, studyIDs: [list of studyIDs]}
    var traits = req.query.traits
    var pValue = parseFloat(req.query.pValue);
    var refGen = req.query.refGen;

    traits = [
        {
            trait: "alzhimers_disease",
            studyIDs: [
                "sID1"
            ]
        },
        // {
        //     trait: "type_2_diabetes",
        //     studyIDs: [
        //         "sID4"
        //     ]
        // }
    ]

    Association.getFromTable(traits, pValue, refGen, async (err, data) => {
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

            //console.log(`Num associations for trait ${trait}: ${data.length}`)
            //returnData[trait] = await separateStudies(data, refGen)
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
            //console.log(data)
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
            let snpsSET = new Set()
            let testArray = []

            for (i=0; i<data.length; i++) {
                for (j=0; j<data[i].length; j++) {
                    testArray.push(data[i][j].snp)
                    snpsSET.add(data[i][j].snp)
                }
            }

            console.log(`SNPS in set: ${snpsSET.size}`)
            console.log(`Total snps: ${testArray.length}`)
            res.send(Array.from(snpsSET));
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

        if (association.citation in studiesAndAssociations) {
            studiesAndAssociations[association.citation].associations.push(row)
        }
        else {
            studiesAndAssociations[association.citation] = {studyID: association.studyID, associations: [row]}
        }
    }
    return studiesAndAssociations
}