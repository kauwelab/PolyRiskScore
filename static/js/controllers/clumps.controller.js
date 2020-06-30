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
            
            if (data.length == 1) {
                clumpsList[data[0].studyID] = [data[0]]
            }

            else {
                for (i=0; i<data.length; i++) {
                    for (j=0; j<data[i].length; j++) {
                        if (data[i][j].studyID in clumpsList) {
                            clumpsList[data[i][j].studyID].push(data[i][j])
                        }
                        else {
                            clumpsList[data[i][j].studyID] = [data[i][j]]
                        }
                    }
                }
            }

            res.send(clumpsList);
        }
    });
};
