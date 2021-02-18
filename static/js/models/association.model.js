const sql = require('./database')
const validator = require('../inputValidator')

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
    this.pValueAnnotation = massociation.pValueAnnotation;
    this.sex = massociation.sex;
    this.citation = massociation.citation;
    this.studyID = massociation.studyID;
};

Association.getFromTables = (studyIDObjs, refGen, result) => {
    // [{trait: "", studyID: ""}, {trait: "", studyID: ""}]
    try {
        queryString = ""
        queryParams = []
        studyIDs = []
        questionMarks = []

        if (!Array.isArray(studyIDObjs)) {
            studyIDObjs = [studyIDObjs]
        }
        // returns the refgen if valid, else throws an error
        refGen = validator.validateRefgen(refGen)

        studyIDObjs.forEach(studyObj => {
            if (!(Object.prototype.toString.call(studyObj) === '[object Object]')) {
                studyObj = JSON.parse(studyObj)
            }
            queryString = queryString.concat(`SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, sex, studyID, trait FROM associations_table WHERE studyID = ? AND trait = ?; `)
            queryParams = queryParams.concat([studyObj.studyID, studyObj.trait])
            studyIDs.push(studyObj.studyID)
            questionMarks.push("?")
        })

        questionMarks = questionMarks.join(", ")
        console.log('about to query table')

        sql.query(queryString, queryParams, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
            console.log(`Got ${res.length} studies with associations from table`)
            console.log("Getting the metaData associated with the studies") 
            sql.query(`SELECT studyID, reportedTrait, citation, trait, ethnicity, `+
             `IF((SELECT altmetricScore FROM studyMaxes WHERE trait=study_table.trait) = altmetricScore, 'HI', '') as hi, `+
             `IF((SELECT cohort FROM studyMaxes WHERE trait=study_table.trait)=initialSampleSize+replicationSampleSize, 'LC', '') as lc, `+
             `IF((SELECT altmetricScore FROM studyMaxes WHERE trait=study_table.reportedTrait) = altmetricScore, 'HI', '') as rthi, `+
             `IF((SELECT cohort FROM studyMaxes WHERE trait=study_table.reportedTrait)=initialSampleSize+replicationSampleSize, 'LC', '') as rtlc `+
             `FROM study_table WHERE studyID IN (${questionMarks}) ORDER BY studyID; `, studyIDs, (err2, traitData) => {
                if (err2) {
                    console.log("error: ", err2);
                    result(err2, null);
                    return;
                }
                result(null, [res, traitData]);
            })
        });
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }
    
};

Association.getAll = (refGen, result) => {
    try {
        console.log(refGen)
        // returns the refgen if valid, else throws an error
        refGen = validator.validateRefgen(refGen)

        queryString = `SELECT snp, ${refGen}, riskAllele, pValue, oddsRatio, sex, studyID, trait FROM associations_table; `
        console.log(queryString)

        sql.query(queryString, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }

            console.log("associations (first): ", res[0]);

            qStr = "SELECT studyID, reportedTrait, citation, trait, ethnicity, "+
             "IF((SELECT altmetricScore FROM studyMaxes WHERE trait=study_table.trait) = altmetricScore, 'HI', '') as hi, "+
             "IF((SELECT cohort FROM studyMaxes WHERE trait=study_table.trait)=initialSampleSize+replicationSampleSize, 'LC', '') as lc, "+
             "IF((SELECT altmetricScore FROM studyMaxes WHERE trait=study_table.reportedTrait) = altmetricScore, 'HI', '') as rthi, "+
             "IF((SELECT cohort FROM studyMaxes WHERE trait=study_table.reportedTrait)=initialSampleSize+replicationSampleSize, 'LC', '') as rtlc "+
             "FROM study_table;"
            sql.query(qStr, (err2, traits) => {
                if (err2) {
                    console.log("error: ", err2);
                    result(err2, null);
                    return;
                }
                result(null, [res, traits]);
            })
        });
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }
}

Association.getAllSnps = (refGen, result) => {
    try {
        if (typeof(refGen) == "undefined") {
            refGen = "hg38"
        }
        else {
            // returns the refgen if valid, else throws an error
            refGen = validator.validateRefgen(refGen)
        }
        console.log(refGen)
        sqlQ = `SELECT DISTINCT snp, ${refGen} as pos FROM associations_table; `
        console.log(sqlQ)
        sql.query(sqlQ, (err, data) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
            console.log(data)
            result(null, data)
        })
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }
}

Association.getAllSnpsToStudyIDs = (refGen, result) => {
    try {
        if (typeof(refGen) == "undefined") {
            refGen = "hg38"
        }
        else {
            // returns the refgen if valid, else throws an error
            refGen = validator.validateRefgen(refGen)
        }

        sql.query(`SELECT snp, ${refGen} as pos, studyID FROM associations_table;`, (err, data) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
            result(null, data)
        })
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }
 }

Association.getSingleSnpFromEachStudy = (refGen, result) => {
    try {
        if (typeof(refGen) == "undefined") {
            refGen = "hg19"
        }
        else {
            // returns the refgen if valid, else throws an error
            refGen = validator.validateRefgen(refGen)
        }
    
        sql.query(`SELECT snp, riskAllele, ${refGen}, studyID FROM associations_table WHERE id IN ( SELECT min(id) FROM associations_table GROUP BY studyID ); `, (err, data) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
    
            result(null, data)
    
        });
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }
}

Association.searchMissingRsIDs = result => {
    sql.query(`SELECT * FROM associations_table WHERE snp = "" or snp = " " or snp IS NULL; `, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(res)
        result(null, res)
    });
}

//get all SNPS for each study that has the ethnicities specified
Association.snpsByEthnicity = (ethnicities, result) => {
    try {
        //select traits and studyIDs from the study table associated with the given ethnicities
        queryString = ""
        queryParams = []
        if (Array.isArray(ethnicities)) {
            for (i = 0; i < ethnicities.length; i++) {
                queryString = queryString.concat(`SELECT studyID FROM study_table WHERE ethnicity LIKE ? ; `)
                queryParams.push(`%${ethnicities[i]}%`)
            }
        }
        else {
            queryString = queryString.concat(`SELECT studyID FROM study_table WHERE ethnicity LIKE ? ; `)
            queryParams.push(`%${ethnicities}%`)
        }
        
        console.log(queryString)
        sql.query(queryString, queryParams, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }

            queryString = ""
            queryParams = []

            //get snps associated with the studyIDs found above 
            for (i = 0; i < res.length; i++) {
                //if there is more than one ethnicity in the selector, select the SNPs for each study
                if(Array.isArray(ethnicities)) {
                    for (j = 0; j < res[i].length; j++) {
                        //TODO clean to remove duplicate code
                        queryString = queryString.concat(`SELECT snp FROM associations_table WHERE studyID = ? ; `)
                        queryParams.push(res[i][j].studyID)
                    }
                }
                //if there is only one ethnicity in the selector, only select SNPs for the studies in that ethnicity
                else {
                    //TODO clean to remove duplicate code
                    queryString = queryString.concat(`SELECT snp FROM associations_table WHERE studyID = ? ; `)
                    queryParams.push(res[i].studyID)
                }
            }

            console.log(queryString)
            sql.query(queryString, queryParams, (err2, data) => {
                if (err2) {
                    console.log("error: ", err2);
                    result(err2, null);
                    return;
                }

                //convert the results to the correct format
                results = []
                //handling for more than one ethnicity
                if (Array.isArray(ethnicities)) {
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
                    //for each study
                    for (i = 0; i < res.length; i++) {
                        //for each row in the study
                        for (k = 0; k < data[i].length; k++) {
                            snps.push(data[i][k].snp)
                        }
                    }
                    ethnicityObj = {
                        "ethnicity": ethnicities,
                        "snps": snps
                    }
                    results.push(ethnicityObj)
                }

                result(null, results)
            })
        })
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }
}

Association.joinTest = (result) => {
    queryString = "SELECT * FROM study_table JOIN Associations ON study_table.studyID = Associations.studyID;"

    //TODO remove
    console.log(queryString)
    sql.query(queryString, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        result(null, res);
    });
};

module.exports = Association;
