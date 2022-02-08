const MAF = require("../models/maf.model.js");


exports.getMaf = (req, res) => {
    var cohort = req.body.cohort
    var chrom = req.body.chrom
    var pos = req.body.pos
    var refGen = req.body.refGen

    MAF.getMAF(cohort, chrom, pos, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving MAF: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            returnData = await formatMAFobj(data)
            res.send(returnData);
        }
    });
};

exports.getAllMaf = (req, res) => {
    var cohort = req.query.cohort
    var chrom = req.query.chrom
    var refGen = req.query.refGen

    MAF.getAllMAF(cohort, chrom, refGen, async (err, data) => {
        if (err) {
            res.status(500).send({
                message: `Error retrieving MAF: ${err}`
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            returnData = await formatMAFobj(data)
            res.send(returnData);
        }
    });
};

exports.getLastMafUpdate = (req, res) => {
    refGen = req.query.refGen
    cohort = req.query.cohort

    associationsPath = path.join(__dirname, '../..', `downloadables/associationsAndClumpsFiles/${cohort}_maf_${refGen}.txt`)
    statsObj = fs.statSync(associationsPath)
    updateTime = statsObj.mtime
    res.send(`${updateTime.getFullYear()}-${updateTime.getMonth() + 1}-${updateTime.getDate()}`)
}

exports.getDownloadMaf = (req, res) => {
    refGen = req.query.refGen
    cohort = req.query.cohort
    downloadPath = path.join(__dirname, '../..', 'downloadables', 'associationsAndClumpsFiles')
    var options = { 
        root: downloadPath
    };
    var fileName = `${cohort}_maf_${refGen}.txt`; 
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

async function formatMAFobj(data) {
    MAF_obj = {}
    for (i=0; i<data.length; i++) {
        maf = data[i]
        if (!(data[i].snp in MAF_obj)) {
            MAF_obj[data[i].snp] = {
                chrom: data[i].chrom,
                pos: data[i].pos,
                alleles: {}
            }
        }
        if (!(data[i].allele in MAF_obj[data[i].snp]['alleles'])) {
            MAF_obj[data[i].snp]['alleles'][data[i].allele] = data[i].alleleFrequency
        }
        else {
            console.log("WE have a duplicate??")
        }
    }
    return MAF_obj
}