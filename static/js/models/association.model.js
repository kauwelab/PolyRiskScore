const sql = require('./database')

const Association = function(massociation) {
    this.id = massociation.id;
    this.snp = massociation.snp;
    this.hg38 = massociation.hg38;
    this.hg19 = massociation.hg19;
    this.hg18 = massociation.hg18;
    this.hg17 = massociation.hg17;
    this.gene = massociation.gene;
    this.ethnicity = massociation.ethnicity;
    this.raf = massociation.raf;
    this.riskAllele = massociation.riskAllele;
    this.pValue = massociation.pValue;
    this.oddsRatio = massociation.oddsRatio;
    this.lowerCI = massociation.lowerCI;
    this.upperCI = massociation.upperCI;
    this.study = massociation.study;
    this.studyID = massociation.studyID;
};

Association.getFromTable = (tableName, studyIDs, pValue, refGen, result) => {

    for (i=0; i < studyIDs.length; i++) {
        studyIDs[i] = "\"" + studyIDs[i] + "\"";
    }

    sql.query(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, study FROM ${tableName} WHERE pValue <= ${pValue} AND studyID IN (${studyIDs})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("traits: ", res);
        result(null, res);
    });
};

//TO DO WORKING HERE
// Association.getAll = (tableName, pValue, refGen, result) => {
//     sql.query(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, study FROM ${tableName} WHERE pValue <= ${pValue}`, (err, res) =>{
//         if (err) {
//             console.log("error: ", err);
//             result(err, null);
//             return;
//         }

//         console.log("traits: ", res);
//         result(null, res);
//     });
// }

module.exports = Association;
