const sql = require('./database')

const Ukbbdata = function (mUkbbdata) {
    this.studyID = mUkbbdata.studyID,
    this.disease = mUkbbdata.disease,
    this.mean = mUkbbdata.mean,
    this.median = mUkbbdata.median,
    this.min = mUkbbdata.min,
    this.max = mUkbbdata.max,
    this.rng = mUkbbdata.rng
    // the rest of the columns should be labled p0-p100
}

Ukbbdata.getDiseases = () => {
    sql.query("SELECT DISTINCT disease FROM ukbiobank_stats;", (err, res) => {
        if (err) {
            console.log("UKBB TABLE error: ", err);
            result(err, null)
            return;
        }
        result(null, res)
    })
}

Ukbbdata.getSummaryResults = (studyIDs, result) => {
    sqlQuestionMarks = ""
    for(i = 0; i < studyIDs.length - 1; i++) {
        sqlQuestionMarks += "?, "
    }
    sqlQuestionMarks += "?"

    sqlStatement = `SELECT disease, studyID, mean, median, min, max, rng FROM ukbiobank_stats WHERE studyID in (${sqlQuestionMarks})`
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
