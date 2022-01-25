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

Maf.getMAF = (cohort, chrom, pos, refGen, result) => {
    try {
        tableName = `${cohort.toLowerCase()}_maf_chr${chrom}`
        sqlQuestionMarks = ""
        for (i=0; i < pos.length - 1; i++) {
            sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
        }
        sqlQuestionMarks = sqlQuestionMarks.concat("?")

        sqlQueryString = `SELECT chrom, ${refGen}, snp, allele, alleleFrequency FROM ${tableName} WHERE snp != "None" AND pos IN (${sqlQuestionMarks});`
        sql.query(sqlQueryString, pos, function(err, rows){
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

Maf.getAllMAF = (cohort, chrom, refGen, result) => {
    try {
        tableName = `${cohort.toLowerCase()}_maf_chr${chrom}`

        sqlQueryString = `SELECT chrom, ${refGen}, snp, allele, alleleFrequency FROM ${tableName} WHERE snp != "None";`
        sql.query(sqlQueryString, function(err, rows){
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