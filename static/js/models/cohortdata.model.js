const sql = require('./database')

const Cohortdata = function (mCohortData) {
    this.studyID = mCohortData.studyID,
    this.reportedTrait = mCohortData.reportedTrait,
    this.trait = mCohortData.trait,
    this.citation = mCohortData.citation,
    this.pValueAnnotation = mCohortData.pValueAnnotation,
    this.betaAnnotation = mCohortData.betaAnnotation,
    this.ogValTypes = mCohortData.ogValTypes,
    this.min = mCohortData.min,
    this.max = mCohortData.max,
    this.rng = mCohortData.rng,
    this.median = mCohortData.median,
    this.mean = mCohortData.mean,
    this.geomMean = mCohortData.geomMean,
    this.harmMean = mCohortData.harmMean,
    this.stdev = mCohortData.stdev,
    this.geomStdev = mCohortData.geomStdev
    // the rest of the columns should be labled p0-p100
}

Cohortdata.getTraits = (result) => {
    sql.query("SELECT DISTINCT trait FROM cohort_summary_data ORDER BY trait;", (err, res) => {
        if (err) {
            console.log("Cohort TABLE error: ", err);
            result(err, null)
            return;
        }
        result(null, res)
    })
}

Cohortdata.getStudies = (trait, studyTypes, result) => {
    // studyMaxes is a view in the database used to find the max values we need 
    studyMaxQuery = `SELECT * FROM studyMaxes WHERE trait = ?`

    if (Array.isArray(trait)) {
        result({message: "ERROR: There are too many traits selected"}, null)
        return
    }

    if (!Array.isArray(studyTypes)) {
        studyTypes = [studyTypes]
    }

    sql.query(studyMaxQuery, [trait], (err, res) => {
        if (err) {
            console.log("Cohort TABLE error: ", err);
            result(err, null)
            return;
        }
        if (res.length == 0) {
            result(null, null);
            return;
        }

        var sqlQueryString = "";
        sqlQueryParams = []
        for (i=0; i<res.length; i++) {
            //subQueryString is the string that we append query constraints to from the HTTP request
            var subQueryString = `SELECT * FROM study_table WHERE ( trait = ? OR reportedTrait = ? )`;
            sqlQueryParams.push(trait)
            sqlQueryParams.push(trait)
            var appendor = "AND (";

            //append sql conditional filters for studyType
            if (studyTypes.includes("LC")) {
                subQueryString = subQueryString.concat(appendor).concat(` initialSampleSize+replicationSampleSize = ? `);
                sqlQueryParams.push(res[i].cohort)
                appendor = "OR";
            }
            if (studyTypes.includes("HI")) {
                subQueryString = subQueryString.concat(appendor).concat(` altmetricScore = ? `);
                sqlQueryParams.push(res[i].altmetricScore)
                appendor = "OR";
            }
            if (studyTypes.includes("O")) {
                subQueryString = subQueryString.concat(appendor).concat(` altmetricScore <> ? AND  initialSampleSize+replicationSampleSize <> ? `);
                sqlQueryParams.push(res[i].altmetricScore)
                sqlQueryParams.push(res[i].cohort)
                appendor = "OR";
            }
            //if the appendor has been updated, then close the parenthesis
            if (appendor !== "AND (") {
                subQueryString = subQueryString.concat(") ")
            }

            subQueryString = subQueryString.concat("; ")
            sqlQueryString = sqlQueryString.concat(subQueryString);
        }

        sql.query(sqlQueryString, sqlQueryParams, (err, data) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }

            sqlString = ""
            sqlQuestionMarks = ""
            params = []
            for (i=0; i<data.length; i++) {
                sqlString += `SELECT trait, studyID, pValueAnnotation, betaAnnotation, ogValueTypes FROM cohort_summary_data WHERE studyID = ? and trait = ? and pValueAnnotation = ? and betaAnnotation = ? and ogValueTypes = ? ;`
                params.push(data[i].studyID, data[i].trait, data[i].pValueAnnotation, data[i].betaAnnotation, data[i].ogValueTypes)
            }

            // grab trait/studyID combos that are in the cohort table
            sql.query(sqlString, params, (err, matchingStudyIDsData) => {
                if (err) {
                    console.log("error: ", err);
                    result(err, null);
                    return;
                }
                result(null, [data, matchingStudyIDsData])
            })
        })
    })
}

Cohortdata.getCohorts = (studyID, trait, pValueAnnotation, betaAnnotation, ogValueTypes, result) => {
    sqlStatement = `SELECT DISTINCT cohort FROM cohort_summary_data WHERE studyID = ? and trait = ? and pValueAnnotation = ? and betaAnnotation = ? and ogValueTypes = ?`
    sql.query(sqlStatement, [studyID, trait, pValueAnnotation, betaAnnotation, ogValueTypes], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        result(null, res);
    })
}

Cohortdata.getSummaryResults = (studyID, trait, cohorts, pValueAnnotation, betaAnnotation, ogValueTypes, result) => {
    sqlStatement = ""
    queryParams = []

    if (cohorts == null || cohorts == "") {
        result({message: "missing cohorts input"}, null)
    }
    if (!Array.isArray(cohorts)) {
        cohorts = [cohorts]
    }

    cohorts.forEach(cohort => {
        sqlStatement = sqlStatement.concat(`SELECT studyID, trait, pValueAnnotation, betaAnnotation, ogValueTypes, min, max, median, rng, mean, geomMean, harmMean, stdev, geomStdev FROM cohort_summary_data WHERE studyID = ? and trait = ? and cohort = ? and pValueAnnotation = ? and betaAnnotation = ? and ogValueTypes = ? ; `)
        queryParams.concat([studyID, trait, cohort, pValueAnnotation, betaAnnotation, ogValueTypes])
    });

    sql.query(sqlStatement, queryParams, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        result(null, res);
    })
}

Cohortdata.getFullResults = (studyID, trait, cohorts, pValueAnnotation, betaAnnotation, ogValueTypes, result) => {
    sqlStatement = ""
    snpsSqlStatement = ""
    queryParams = []
    snpsQueryParams = []

    if (cohorts == null || cohorts == "") {
        result({message: "missing cohorts input"}, null)
    }
    if (!Array.isArray(cohorts)) {
        cohorts = [cohorts]
    }

    cohorts.forEach(cohort => {
        sqlStatement = sqlStatement.concat(`SELECT * FROM cohort_summary_data JOIN cohort_percentiles ON ( cohort_summary_data.studyID = cohort_percentiles.studyID AND cohort_summary_data.trait = cohort_percentiles.trait and cohort_summary_data.cohort = cohort_percentiles.cohort ) WHERE cohort_summary_data.studyID = ? and cohort_summary_data.trait = ? and cohort_summary_data.cohort = ? ; `)
        queryParams = queryParams.concat([studyID, trait, cohort])

        snpsSqlStatement = snpsSqlStatement.concat("SELECT * FROM cohort_snps WHERE studyID = ? and trait = ? and cohort = ? AND pValueAnnotation = ? AND betaAnnotation = ? AND ogValueTypes = ?; ")
        snpsQueryParams.push(studyID)
        snpsQueryParams.push(trait)
        snpsQueryParams.push(cohort)
        snpsQueryParams.push(pValueAnnotation)
        snpsQueryParams.push(betaAnnotation)
        snpsQueryParams.push(ogValueTypes)
        // the snps we have for ADNI cover MCI, AD, and controls
        // if (cohort.includes("adni")) {
        //     snpsQueryParams.push("adni")
        // }
        // else {
        //     snpsQueryParams.push(cohort)
        // }
    });

    sql.query(sqlStatement, queryParams, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        sql.query(snpsSqlStatement, snpsQueryParams, (err, res2) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }

            if (!Array.isArray(res[0])) {
                res[0]["snps"] = res2[0]["snps"].split("|")
            } else {
                for (i = 0; i < res.length; i++) {
                    res[i][0]["snps"] = res2[i][0]["snps"].split("|")
                }
            }
            result(null, res);
        })
    })
}

Cohortdata.getStudySnps = (studyID, trait, cohort, pValueAnnotation, betaAnnotation, ogValueTypes, result) => {
    sqlStatement = "SELECT * FROM cohort_snps WHERE studyID = ? and trait = ? and cohort = ? AND pValueAnnotation = ? AND betaAnnotation = ? AND ogValueTypes = ? "
    sql.query(sqlStatement, [studyID, trait, cohort, pValueAnnotation, betaAnnotation, ogValueTypes], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        result(null, res);
    })
}

Cohortdata.getPercentiles = (studyIDObjs, cohort, result) => {
    try {
        queryString = ""
        queryParams = []

        if (!Array.isArray(studyIDObjs)) {
            studyIDObjs = [studyIDObjs]
        }

        studyIDObjs.forEach(studyObj => {
            if (!(Object.prototype.toString.call(studyObj) === '[object Object]')) {
                studyObj = JSON.parse(studyObj)
            }
            queryString = queryString.concat(`SELECT * FROM cohort_percentiles WHERE studyID = ? AND trait = ? AND pValueAnnotation = ? AND betaAnnotation = ? AND ogValueTypes = ? AND cohort = ?; `)
            queryParams = queryParams.concat([studyObj.studyID, studyObj.trait, studyObj.pValueAnnotation, studyObj.betaAnnotation, studyObj.ogValueTypes, cohort])
        })
        console.log('about to query table')

        sql.query(queryString, queryParams, (err, res) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
            result(null, res);
        });
    } catch (e) {
        console.log("Error: ", e)
        result(e, null)
    }

}

module.exports = Cohortdata;
