const sql = require('./database')
const formatter = require('../formatHelper')

const Association = function(massociation) {
    this.id = massociation.id;
    this.snp = massociation.snp;
    this.hg38 = massociation.hg38;
    this.hg19 = massociation.hg19;
    this.hg18 = massociation.hg18;
    this.hg17 = massociation.hg17;
    this.gene = massociation.gene;
    this.raf = massociation.raf;
    this.riskAllele = massociation.riskAllele;
    this.pValue = massociation.pValue;
    this.oddsRatio = massociation.oddsRatio;
    this.lowerCI = massociation.lowerCI;
    this.upperCI = massociation.upperCI;
    this.citation = massociation.citation;
    this.studyID = massociation.studyID;
};

Association.getFromTables = (traits, pValue, refGen, result) => {
    queryString = ""
    for (i=0; i < traits.length; i++) {
        traitObj = traits[i]
        studyIDs = traitObj.studyIDs
        for (j=0; j<studyIDs.length; j++) {
            studyIDs[j] = "\"" + studyIDs[j] + "\"";
        }
        queryString = queryString.concat(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, citation, studyID FROM \`${formatter.formatForTableName(traitObj.trait)}\` WHERE pValue <= ${pValue} AND studyID IN (${studyIDs}); `)
    }

    console.log(queryString)
    sql.query(queryString, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        console.log(res)
        result(null, res);
    });
};

Association.getAll = (traits, pValue, refGen, result) => {
    console.log(refGen, pValue, traits)
    queryString = ""
    
    for (i = 0; i < traits.length; i++) {
        trait = formatter.formatForTableName(traits[i])
        queryString = queryString.concat(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, citation, studyID FROM \`${trait}\` WHERE pValue <= ${pValue}`)
        if (i < traits.length - 1) {
            queryString = queryString.concat("; ")
        }
    }
    
    console.log(queryString)

    sql.query(queryString, (err, res) =>{
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("associations (first): ", res[0]);
        result(null, res);
    });
}

Association.getAllSnps = result => {
    //selects unique trait names for querying all association tables
    sql.query(`SELECT DISTINCT trait FROM study_table`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("num Traits: ", res.length);
        queryString = ""
        // turn traits into table names 
        for (i=0; i<res.length; i++) {
            trait = formatter.formatForTableName(res[i].trait)
            queryString = queryString.concat(`SELECT DISTINCT snp, hg38 FROM \`${trait}\`; `)
        }

        sql.query(queryString, (err2, data) => {
            if (err2) {
                console.log("error: ", err2);
                result(err2, null);
                return;
            }

            result(null, data)
        })
        
    });
}

module.exports = Association;
