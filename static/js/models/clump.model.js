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

Clump.getClumps = (studyIDs, superpopclump, result) => {
    for (i=0; i < studyIDs.length; i++) {
        studyIDs[i] = "\"" + studyIDs[i] + "\"";
    }

    sql.query(`SELECT studyID, snp, hg38_pos, ${superpopclump} AS clumpNumber FROM clumps WHERE studyID IN (${studyIDs})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`Clumps quetied for ${studyIDs}, ${res.length} result(s)`);
        result(null, res);
    });
};

module.exports = Clump;