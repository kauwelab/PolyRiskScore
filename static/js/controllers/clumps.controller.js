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
    refGenome = req.body.refGen
    superPopulation = formatter.formatForClumpsTable(req.body.superPop)
    positions = req.body.positions

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
    refGenome = req.body.refGen
    superPopulation = formatter.formatForClumpsTable(req.body.superPop)
    snps = req.body.snps

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
    for (i=0; i < clumps.length; i++) {
        if (Array.isArray(clumps[i])) {
            for (j=0; j < clumps[i].length; j++) {
                clump = clumps[i][j]
                if (!(clump['snp'] in clumpsFormatted)) {
                    clumpsFormatted[clump['snp']] = {
                        clumpNum: clump.clumpNum,
                        pos: clump.position
                    }
                }
            }
        }
        else {
            clump = clumps[i]
            if (!(clump['snp'] in clumpsFormatted)) {
                clumpsFormatted[clump['snp']] = {
                    clumpNum: clump.clumpNum,
                    pos: clump.position
                }
            }
        }
    }
    return clumpsFormatted
}
