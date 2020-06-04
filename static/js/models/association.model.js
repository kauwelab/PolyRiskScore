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

    sql.query(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, study FROM \`${tableName}\` WHERE pValue <= ${pValue} AND studyID IN (${studyIDs})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("associations: ", res);
        result(null, res);
    });
};

Association.getAll = (traits, pValue, refGen, result) => {
    console.log(refGen, pValue, traits)
    queryString = ""
    
    for (i = 0; i < traits.length; i++) {
        queryString = queryString.concat(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, study FROM \`${traits[i]}\` WHERE pValue <= ${pValue}`)
        if (i < traits.length - 1) {
            queryString = queryString.concat("; ")
        }
    }
    
    sql.query(queryString, (err, res) =>{
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        //console.log("associations: ", res);
        result(null, res);
    });
}

module.exports = Association;
