const sql = require('./database')
const validator = require('../inputValidator')
var async = require( 'async' );

const Maf = function(mmaf) {
    this.chrom = mmaf.chrom,
    this.pos = mmaf.pos,
    this.snp = mmaf.snp,
    this.allele = mmaf.allele,
    this.alleleFrequency = mmaf.alleleFrequency
}

Maf.getMAF = (cohort, chrom, pos, result) => {
    try {
        sqlQuestionMarks = ""
        for (i=0; i < positions.length - 1; i++) {
            sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
        }
        sqlQuestionMarks = sqlQuestionMarks.concat("?")

        sqlQueryString = `SELECT * FROM ADNI_chr${chrom}_maf WHERE snp != "None" AND pos IN (${sqlQuestionMarks});`
        sql.query(sqlQueryString, snps, function(err, rows){
            if (err) {
                console.log(err)
                console.log("Honestly, we probably want it to fail here")
                result(err, null)
                return
            }
            else {
                result(null, rows)
                return
            }
        })

    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    }
}

module.exports = Maf;