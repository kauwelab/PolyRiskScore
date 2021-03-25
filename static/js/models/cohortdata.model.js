const sql = require('./database')

const Cohortdata = function (mCohortData) {
    this.studyID = mCohortData.studyID,
    this.trait = mCohortData.trait,
    this.mean = mCohortData.mean,
    this.median = mCohortData.median,
    this.min = mCohortData.min,
    this.max = mCohortData.max,
    this.rng = mCohortData.rng
    // the rest of the columns should be labled p0-p100
}

//TODO!!!!!: we should maybe add reportedTrait to the ukbb data table as a column?

Cohortdata.getTraits = (result) => {
    sql.query("SELECT DISTINCT trait FROM ukbb_summary_data ORDER BY trait;", (err, res) => {
        if (err) {
            console.log("UKBB TABLE error: ", err);
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
            console.log("UKBB TABLE error: ", err);
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

            sqlQuestionMarks = ""
            studyIDs = []
            for (i=0; i<data.length; i++) {
                if (i == data.length-1) {
                    sqlQuestionMarks = sqlQuestionMarks.concat("?")
                } else {
                    sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
                }
                studyIDs.push(data[i].studyID)
            }

            // grab trait/studyID combos that are in the ukbb table
            sql.query(`SELECT trait, studyID FROM ukbb_summary_data WHERE studyID IN (${sqlQuestionMarks})`, studyIDs, (err, matchingStudyIDsData) => {
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

Cohortdata.getSummaryResults = (studyID, trait, result) => {

    sqlStatement = `SELECT studyID, trait, min, max, median, rng, mean, geomMean, harmMean, stdev, geomStdev FROM ukbb_summary_data WHERE studyID = ? and trait = ?`
    sql.query(sqlStatement, [studyID, trait], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        result(null, res);
    })
}

Cohortdata.getFullResults = (studyID, trait, result) => {

    sqlStatement = `SELECT * FROM ukbb_summary_data JOIN ukbb_percentiles ON ( ukbb_summary_data.studyID = ukbb_percentiles.studyID AND ukbb_summary_data.trait = ukbb_percentiles.trait ) WHERE ukbb_summary_data.studyID = ? and ukbb_summary_data.trait = ?`
    sql.query(sqlStatement, [studyID, trait], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        sqlGetSnps = "SELECT * FROM ukbb_snps WHERE studyID = ? and trait = ?"
        sql.query(sqlGetSnps, [studyID, trait], (err, res2) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
            res[0]["snps"] = res2[0]["snps"].split("|")
            result(null, res);
        })
    })
}

Cohortdata.getStudySnps = (studyID, trait, result) => {
    sqlStatement = "SELECT * FROM ukbb_snps WHERE studyID = ? and trait = ?"
    sql.query(sqlStatement, [studyID, trait], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        result(null, res);
    })
}

module.exports = Cohortdata;
