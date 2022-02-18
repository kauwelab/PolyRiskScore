const Clump = require("../models/clump.model.js");
const formatter = require("../formatHelper")
const path = require("path")
const fs = require("fs");

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

    downloadPath = path.join(__dirname, '../..', 'downloadables', 'preppedServerFiles')
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

// gets the last time the clumps file was updated.Used for the cli to check if the user needs to re-download clumps data
exports.getLastClumpsUpdate = (req, res) => {
    refGen = req.query.refGen
    pop = req.query.superPop

    clumpsPath = path.join(path.join(__dirname, '../..', `downloadables/preppedServerFiles/${pop}_clumps_${refGen}.txt`))
    statsObj = fs.statSync(clumpsPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
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
