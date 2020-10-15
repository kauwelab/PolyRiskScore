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
    try {
        clumpsTable = getClumpsTableName(refGenome)
        sql.query(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${clumpsTable}`, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }

            console.log(`Clumps queried for ${superpopclump}, ${res.length} result(s)`);
            result(null, res);
        });
    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    }
    
    
};

Clump.getClumpsByPos = (superpopclump, refGenome, positions, result) => {
    try {
        sqlQuestionMarks = ""
        for (i=0; i < positions.length - 1; i++) {
            sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
        }
        sqlQuestionMarks = sqlQuestionMarks.concat("?")

        clumpsTable = getClumpsTableName(refGenome)

        sql.query(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${clumpsTable} WHERE position IN (${sqlQuestionMarks})`, positions, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(null, err);
                return;
            }

            console.log(`Clumps queried by position for ${superpopclump}; ex: ${positions[0]} - ${res.length} result(s)`);
            result(null, res);
        });
    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    }
    
}

Clump.getClumpsBySnp = (superpopclump, refGenome, snps, result) => {
    try {
        sqlQuestionMarks = ""
        for (i=0; i < snps.length - 1; i++) {
            sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
        }
        sqlQuestionMarks = sqlQuestionMarks.concat("?")

        clumpsTable = getClumpsTableName(refGenome)
    
        sql.query(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${clumpsTable} WHERE snp IN (${sqlQuestionMarks})`, snps, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(null, err);
                return;
            }
    
            console.log(`Clumps queried by snp for ${superpopclump}, ex: ${snp[0]} - ${res.length} result(s)`);
            result(null, res);
        });
    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    }
}

function getClumpsTableName(refGen) {
    if (["hg17", "hg18", "hg19", "hg38"].includes(refGen.toLowerCase())){
        return `${refGen.toLowerCase()}_clumps`
    }
    else {
        throw "invalid reference genome"
    }
}

module.exports = Clump;