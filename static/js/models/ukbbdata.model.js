const sql = require('./database')

const Ukbbdata = function (mUkbbdata) {
    this.studyID = mUkbbdata.studyID,
    this.trait = mUkbbdata.trait,
    this.mean = mUkbbdata.mean,
    this.median = mUkbbdata.median,
    this.min = mUkbbdata.min,
    this.max = mUkbbdata.max,
    this.rng = mUkbbdata.rng
    // the rest of the columns should be labled p0-p100
}

//TODO!!!!!: we should maybe add reportedTrait to the ukbb data table as a column?

Ukbbdata.getTraits = (result) => {
    sql.query("SELECT DISTINCT trait FROM ukbiobank_stats;", (err, res) => {
        if (err) {
            console.log("UKBB TABLE error: ", err);
            result(err, null)
            return;
        }
        result(null, res)
    })
}

Ukbbdata.getStudies = (trait, studyTypes, result) => {
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
            var subQueryString = `SELECT * FROM study_table WHERE ( trait = ? OR reportedTrait = ? ) ORDER BY trait`;
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
            sql.query(`SELECT trait, studyID FROM ukbiobank_stats WHERE studyID IN (${sqlQuestionMarks}) ORDER BY trait`, studyIDs, (err, matchingStudyIDsData) => {
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

//TODO UPDATE THESE FOR TRAIT?
Ukbbdata.getSummaryResults = (studyIDs, result) => {
    if (!Array.isArray(studyIDs)) {
        studyIDs = [studyIDs]
    }
    sqlQuestionMarks = ""
    console.log(studyIDs)
    for(i = 0; i < studyIDs.length - 1; i++) {
        sqlQuestionMarks += "?, "
    }
    sqlQuestionMarks += "?"

    sqlStatement = `SELECT trait, studyID, mean, median, min, max, rng FROM ukbiobank_stats WHERE studyID in (${sqlQuestionMarks})`
    sql.query(sqlStatement, studyIDs, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        result(null, res);
    })
}

Ukbbdata.getFullResults = (studyID, trait, result) => {

    sqlStatement = `SELECT * FROM ukbiobank_stats WHERE studyID = ? and trait = ?`
    sql.query(sqlStatement, [studyID, trait], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        result(null, res);
    })
}

module.exports = Ukbbdata;
