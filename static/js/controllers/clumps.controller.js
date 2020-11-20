const Clump = require("../models/clump.model.js");
const formatter = require("../formatHelper")

exports.getClumping = (req, res) => {
    refGenome = req.query.refGen
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    Clump.getClumps(superPopulation, refGenome, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(formatClumpingReturn(data));
        }
    });
};

exports.getClumpingByPos = (req, res) => {
    refGenome = req.query.refGen
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    positions = req.query.positions
    Clump.getClumpsByPos(superPopulation, refGenome, positions, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(formatClumpingReturn(data));
        }
    });
};

exports.getClumpingBySnp = (req, res) => {
    refGenome = req.query.refGen
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    snps = req.query.snps
    Clump.getClumpsBySnp(superPopulation, refGenome, snps, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(formatClumpingReturn(data));
        }
    });
};

function formatClumpingReturn(clumps) {
    clumpsFormatted = {}
    clumpsFormatted["clumps"] = []
    for (i=0; i < clumps.length; i++) {
        if (Array.isArray(clumps[i])) {
            for (j=0; j < clumps[i].length; j++) {
                clumpsFormatted["clumps"].push(clumps[i][j])
            }
        }
        else {
            clumpsFormatted["clumps"].push(clumps[i])
        }
    }
    return clumpsFormatted
}
