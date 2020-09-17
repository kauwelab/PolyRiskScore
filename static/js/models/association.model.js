const sql = require('./database')
const formatter = require('../formatHelper')

const Association = function (massociation) {
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
    for (i = 0; i < traits.length; i++) {
        traitObj = traits[i]
        studyIDs = traitObj.studies
        for (j = 0; j < studyIDs.length; j++) {
            studyIDs[j] = "\"" + studyIDs[j] + "\"";
        }
        queryString = queryString.concat(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, citation, studyID FROM \`${formatter.formatForTableName(traitObj.trait)}\` WHERE pValue <= ${pValue} AND studyID IN (${studyIDs}); `)
    }

    //TODO remove
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

    console.log(typeof(traits))
    for (i = 0; i < traits.length; i++) {
        trait = formatter.formatForTableName(traits[i])
        queryString = queryString.concat(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, citation, studyID FROM \`${trait}\` WHERE pValue <= ${pValue}`)
        if (i < traits.length - 1) {
            queryString = queryString.concat("; ")
        }
    }

    console.log(queryString)

    sql.query(queryString, (err, res) => {
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
        for (i = 0; i < res.length; i++) {
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

Association.getSingleSnpFromEachStudy = result => {
    sql.query(`SELECT DISTINCT trait FROM study_table`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("num Traits: ", res.length);
        queryString = ""
        // turn traits into table names 
        for (i = 0; i < res.length; i++) {
            trait = formatter.formatForTableName(res[i].trait)
            queryString = queryString.concat(`SELECT snp, riskAllele, hg19 FROM \`${trait}\` WHERE id IN ( SELECT min(id) FROM \`${trait}\` GROUP BY studyID ); `)
        }

        sql.query(queryString, (err2, data) => {
            if (err2) {
                console.log("error: ", err2);
                result(err2, null);
                return;
            }

            console.log(data)
            result(null, data)
        })

    });
}

Association.searchMissingRsIDs = result => {
    sql.query(`SELECT DISTINCT trait FROM study_table`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log("num Traits: ", res.length);
        queryString = ""
        // turn traits into table names 
        for (i = 0; i < res.length; i++) {
            trait = formatter.formatForTableName(res[i].trait)
            queryString = queryString.concat(`SELECT * FROM \`${trait}\` WHERE snp = "" or snp = " " or snp IS NULL; `)
        }

        sql.query(queryString, (err2, data) => {
            if (err2) {
                console.log("error: ", err2);
                result(err2, null);
                return;
            }

            console.log(data)
            result(null, data)
        })

    });
}

//get all SNPS for each study that has the ethnicities specified
Association.snpsByEthnicity = (ethnicities, result) => {

    //select traits and studyIDs from the study table associated with the given ethnicities
    queryString = ""
    for (i = 0; i < ethnicities.length; i++) {
        queryString = queryString.concat(`SELECT trait, studyID FROM study_table WHERE ethnicity LIKE '%${ethnicities[i]}%'; `)
    }

    console.log(queryString)
    sql.query(queryString, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        queryString = ""

        //get snps associated with the studyIDs found above 
        for (i = 0; i < res.length; i++) {
            //if there is more than one ethnicity in the selector, select the SNPs for each study
            if(ethnicities.length > 1) {
                for (j = 0; j < res[i].length; j++) {
                    //TODO clean to remove duplicate code
                    trait = formatter.formatForTableName(res[i][j].trait)
                    queryString = queryString.concat(`SELECT snp FROM \`${trait}\` WHERE studyID = '${res[i][j].studyID}'; `)
                }
            }
            //if there is only one ethnicity in the selector, only select SNPs for the studies in that ethnicity
            else {
                //TODO clean to remove duplicate code
                trait = formatter.formatForTableName(res[i].trait)
                queryString = queryString.concat(`SELECT snp FROM \`${trait}\` WHERE studyID = '${res[i].studyID}'; `)
            }
        }

        console.log(queryString)
        sql.query(queryString, (err2, data) => {
            if (err2) {
                console.log("error: ", err2);
                result(err2, null);
                return;
            }

            //convert the results to the correct format
            results = []
            //handling for more than one ethnicity
            if (ethnicities.length > 1) {
                //TODO clean to remove duplicate code
                //for each ethnicity
                for (i = 0; i < res.length; i++) {
                    ethnicity = ethnicities[i]

                    //for each study
                    snps = []
                    for (j = 0; j < res[i].length; j++) {
                        snpIndex = i*2+j // gives the correct index of the snps corresponding to the trait/study combo

                        //for each row in the study
                        
                        for (k = 0; k < data[snpIndex].length; k++) {
                            snps.push(data[snpIndex][k].snp)
                        }
    
                    }
                    ethnicityObj = {
                        "ethnicity": ethnicity,
                        "snps": snps
                    }
                    results.push(ethnicityObj)
                }
            }
            //handling for a single ethnicity
            else {
                //TODO clean to remove duplicate code
                console.log(res.length)
                snps = []
                ethnicity = ethnicities[0]
                //for each study
                for (i = 0; i < res.length; i++) {
                    //for each row in the study
                    for (k = 0; k < data[i].length; k++) {
                        snps.push(data[i][k].snp)
                    }
                }
                ethnicityObj = {
                    "ethnicity": ethnicity,
                    "snps": snps
                }
                results.push(ethnicityObj)
            }

            result(null, results)
        })
    })
}

module.exports = Association;
