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

Maf.getMAF = (cohort, result) => {
    try {
        chromosomes = Array.from({length: 22}, (_, i) => i + 1)

        MAF_list = []

        async.forEachOf(chromosomes, function (dataElement, i, inner_callback){

            sqlQueryString = `SELECT * FROM ADNI_chr${dataElement}_maf WHERE snp != "None";`
            sql.query(sqlQueryString, function(err, rows){
                if (err) {
                    console.log(err)
                    console.log("Honestly, we probably want it to fail here")
                    result(err, null)
                    return
                }
                else {
                    MAF_list = MAF_list.concat(rows)
                    inner_callback(null)
                }
            })

        }, function(err){
            if (err) {
                console.log(err)
                result(err, null)
                return
            }
            else {
                result(null, MAF_list);
                return
            }
        })

    } catch (e) {
        console.log("ERROR:", e)
        result(e, null)
    }
}

module.exports = Maf;