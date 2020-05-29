const Association = require("../models/association.model.js");

exports.getFromTable = (req, res) => {
    Association.getFromTable(req.query.tableName, req.query.studyID, req.query.pValue, req.query.refGen, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving associations"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    });
};

// exports.getAll = (req, res) => {
//     completeData = {}
//     allTraits = ['alzhimers_disease', 'type_2_diabetes']//req.query.traits;
//     for (i=0; i < allTraits.length; i++) {
//         Association.getAll(allTraits[i], req.query.pValue, req.query.refGen, (err, data) => {
//             if (err) {
//                 res.status(500).send({
//                     message: "Error retrieving associations"
//                 });
//                 return;
//             }
//             else {
//                 completeData[allTraits[i]] = data
//             }
//         });
//     }

//     res.send(completeData);
// }