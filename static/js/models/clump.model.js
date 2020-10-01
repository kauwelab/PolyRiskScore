const sql = require('./database')

const Clump = function(mclump) {
    this.snp = mclump.snp,
    this.pos = mclump.pos,
    this.african_Clump = mclump.african_Clump,
    this.american_Clump = mclump.american_Clump,
    this.eastAsian_Clump = mclump.eastAsian_Clump,
    this.european_Clump = mclump.european_Clump,
    this.southAsian_Clump = mclump.southAsian_Clump
}

Clump.getClumps = (superpopclump, refGenome, result) => {
    sql.query(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${refGenome}_clumps`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`Clumps queried for ${superpopclump}, ${res.length} result(s)`);
        result(null, res);
    });
};

Clump.getClumpsByPos = (superpopclump, refGenome, positions, result) => {
    for (i=0; i < positions.length; i++) {
        positions[i] = "\"" + positions[i] + "\"";
    }

    sql.query(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${refGenome}_clumps WHERE position IN (${positions})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`Clumps queried by position for ${superpopclump}; ex: ${positions[0]} - ${res.length} result(s)`);
        result(null, res);
    });
}

Clump.getClumpsBySnp = (superpopclump, refGenome, snps, result) => {
    for (i=0; i < snps.length; i++) {
        snps[i] = "\"" + snps[i] + "\"";
    }

    sql.query(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${refGenome}_clumps WHERE snp IN (${snps})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`Clumps queried by snp for ${superpopclump}, ex: ${snp[0]} - ${res.length} result(s)`);
        result(null, res);
    });
}

module.exports = Clump;