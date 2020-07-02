const Clump = require("../models/clump.model.js");
const formatter = require("../formatHelper")

exports.getClumping = (req, res) => {
    snps = req.query.snps
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    Clump.getClumps(snps, superPopulation, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');

            clumpsList = {}

            for (i=0; i<data.length; i++) {
                if (data[i].snp in clumpsList) {
                    clumpsList[data[i].snp].push(data[i])
                }
                else {
                    clumpsList[data[i].snp] = [data[i]]
                }
            }

            res.send(clumpsList);
        }
    });
};
