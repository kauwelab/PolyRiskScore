const Clump = require("../models/clump.model.js");
const formatter = require("../formatHelper")
const path = require("path")

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

exports.getClumpsDownloadFile = (req, res) => {
    refGen = req.query.refGen
    pop = req.query.superPop

    downloadPath = path.join(__dirname, '../..', 'downloadables', 'associationsAndClumpsFiles')
    var options = { 
        root: downloadPath
    };
    var fileName = `${pop}_clumps_${refGen}.txt`; 
    res.sendFile(fileName, options, function (err) { 
        if (err) { 
            console.log(err); 
            res.status(500).send({
                message: "Error finding file"
            });
        } else { 
            console.log('Sent:', fileName); 
        } 
    }); 
}

function formatClumpingReturn(clumps) {

    clumpsFormatted = {}
    for (i=0; i < clumps.length; i++) {
        if (Array.isArray(clumps[i])) {
            for (j=0; j < clumps[i].length; j++) {
                clump = clumps[i][j]
                if (!(clump['snp'] in clumpsFormatted)) {
                    clumpsFormatted[clump['snp']] = {
                        clumpNum: clump.clumpNumber,
                        pos: clump.position
                    }
                }
            }
        }
        else {
            clump = clumps[i]
            if (!(clump['snp'] in clumpsFormatted)) {
                clumpsFormatted[clump['snp']] = {
                    clumpNum: clump.clumpNumber,
                    pos: clump.position
                }
            }
        }
    }
    return clumpsFormatted
}
