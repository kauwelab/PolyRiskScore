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
            res.send(data);
        }
    });
};

exports.getClumpingByPos = (req, res) => {
    refGenome = req.query.refGen
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    positions = req.query.positions
    Clump.getClumps(superPopulation, refGenome, positions, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    });
};

exports.getClumpingBySnp = (req, res) => {
    refGenome = req.query.refGen
    superPopulation = formatter.formatForClumpsTable(req.query.superPop)
    snps = req.query.snps
    Clump.getClumps(superPopulation, refGenome, snps, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving clumping data"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    });
};
