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

Ukbbdata.getTraits = (result) => {
    sql.query("SELECT DISTINCT trait, studyID FROM ukbiobank_stats;", (err, res) => {
        if (err) {
            console.log("UKBB TABLE error: ", err);
            result(err, null)
            return;
        }
        result(null, res)
    })
}

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

Ukbbdata.getFullResults = (studyIDs, result) => {
    if (!Array.isArray(studyIDs)) {
        studyIDs = [studyIDs]
    }
    sqlQuestionMarks = ""
    for(i = 0; i < studyIDs.length - 1; i++) {
        sqlQuestionMarks += "?, "
    }
    sqlQuestionMarks += "?"

    sqlStatement = `SELECT * FROM ukbiobank_stats WHERE studyID in (${sqlQuestionMarks})`
    sql.query(sqlStatement, studyIDs, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        result(null, res);
    })
}

module.exports = Ukbbdata;
