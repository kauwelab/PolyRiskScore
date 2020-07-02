const sql = require('./database')

const Clump = function(mclump) {
    this.studyID = mclump.studyID,
    this.trait = mclump.trait,
    this.snp = mclump.snp,
    this.hg38_pos = mclump.hg38_pos,
    this.african_Clump = mclump.african_Clump,
    this.american_Clump = mclump.american_Clump,
    this.eastAsian_Clump = mclump.eastAsian_Clump,
    this.european_Clump = mclump.european_Clump,
    this.southAsian_Clump = mclump.southAsian_Clump
}

Clump.getClumps = (snps, superpop, result) => {
    for (i=0; i < snps.length; i++) {
        snps[i] = "\"" + snps[i] + "\"";
    }

    sql.query(`SELECT snp, hg38_pos, ${superpop} AS clumpNumber FROM clumps WHERE snp IN (${snps})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`Clumps queried for ${snps.length} snps, ${res.length} result(s)`);
        result(null, res);
    });
};

module.exports = Clump;