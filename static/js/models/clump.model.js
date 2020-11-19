const sql = require('./database')
const validator = require('../inputValidator')

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
        refGen = validator.validateRefgen(refGenome)
        sqlString = ""

        for (i=1; i < 23; i++){
            sqlString = sqlString.concat(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${refGen}_chr${i}_clumps; `)
        }

        sql.query(sqlString, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }

            console.log(`Clumps queried for ${superpopclump}, ${res.length} chromosome result(s)`);
            result(null, res);
        });
    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    } 
};

Clump.getClumpsByPos = (superpopclump, refGenome, positions, result) => {
    try {
        refGen = validator.validateRefgen(refGenome)
        positions.sort()
        chromosomesToSearch = {}
        const regexExpr = /([1-9][0-9]?)/

        for (const position in positions) {
            match = position.match(regexExpr)

            if (!(match[0] in Object.keys(chromosomesToSearch))) {
                chromosomesToSearch[match[0]] = new Set()
            }
            chromosomesToSearch[match[0]].add(position)
        }

        sqlString = ""
        sqlParams = []

        for (const i in Object.keys(chromosomesToSearch)) {
            sqlQuestionMarks = ""

            for (j=0; j < chromosomesToSearch[i].length - 1; j++) {
                sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
            }
            sqlQuestionMarks = sqlQuestionMarks.concat("?")

            sqlString = sqlString.concat(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${refGen}_chr${i}_clumps WHERE position IN (${sqlQuestionMarks}); `)
            sqlParams = sqlParams.concat(Array.from(chromosomesToSearch[i]))
        }

        sql.query(sqlString, sqlParams, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(null, err);
                return;
            }

            console.log(`Clumps queried by position for ${superpopclump}; ex: ${positions[0]} - ${res.length} chromosome result(s)`);
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

        refGen = validator.validateRefgen(refGenome)

        sqlString = ""
        for (i=1; i < 23; i++) {
            sqlString = sqlString.concat(`SELECT snp, position, ${superpopclump} AS clumpNumber FROM ${refGen}_chr${i}_clumps WHERE snp IN (${sqlQuestionMarks}); `)
        }
    
        sql.query(sqlString, snps, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(null, err);
                return;
            }
    
            console.log(`Clumps queried by snp for ${superpopclump}, ex: ${snp[0]} - ${res.length} chromosome result(s)`);
            result(null, res);
        });
    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    }
}

module.exports = Clump;