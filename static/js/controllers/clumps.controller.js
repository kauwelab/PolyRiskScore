const Clump = require("../models/clump.model.js");
const formatter = require("../formatHelper")

exports.getClumping = (req, res) => {
    refGenome = req.query.refGen
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    isPosBased = req.query.isPosBased

    Clump.getClumps(superPopulation, refGenome, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(formatClumpingReturn(data, isPosBased));
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
            res.send(formatClumpingReturn(data, true));
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
            res.send(formatClumpingReturn(data, false));
        }
    });
};

function formatClumpingReturn(clumps,  isPosBased) {

    ident = (isPosBased.toLowerCase() == 'true') ? 'position' : 'snp'

    clumpsFormatted = {}
    for (i=0; i < clumps.length; i++) {
        if (Array.isArray(clumps[i])) {
            for (j=0; j < clumps[i].length; j++) {
                clump = clumps[i][j]
                if (!(clump[ident] in clumpsFormatted)) {
                    clumpsFormatted[clump[ident]] = {
                        clumpNum: clump.clumpNum,
                        snp: clump.snp,
                        pos: clump.position
                    }
                }
            }
        }
        else {
            clump = clumps[i]
            if (!(clump[ident] in clumpsFormatted)) {
                clumpsFormatted[clump[ident]] = {
                    clumpNum: clump.clumpNum,
                    snp: clump.snp,
                    pos: clump.position
                }
            }
        }
    }
    return clumpsFormatted
}
