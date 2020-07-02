const Clump = require("../models/clump.model.js");
const formatter = require("../formatHelper")

exports.getClumping = (req, res) => {
    studyIDs = req.query.studyIDs
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    Clump.getClumps(studyIDs, superPopulation, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');

            clumpsList = {}

            for (i=0; i<data.length; i++) {
                if (data[i].studyID in clumpsList) {
                    clumpsList[data[i].studyID].push(data[i])
                }
                else {
                    clumpsList[data[i].studyID] = [data[i]]
                }
            }

            res.send(clumpsList);
        }
    });
};
