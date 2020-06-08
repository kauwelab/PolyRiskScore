const sql = require('./database')

const Study = function(mstudy) {
    this.studyID = mstudy.studyID,
    this.pubMedID = mstudy.pubMedID,
    this.citation = mstudy.citation,
    this.studyScore = mstudy.studyScore,
    this.ethnicity = mstudy.ethnicity,
    this.cohort = mstudy.cohort,
    this.title = mstudy.title,
    this.lastUpdated = mstudy.lastUpdated
}

Study.getAll = result => {
    sql.query("SELECT * FROM study_table", (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`All studies queried, ${res.length} result(s)`);
        result(null, res);
    });
};

Study.getByIds = (studyIDs, result) => {
    //formatting studyIDs to be accepted in mysql query
    for (i=0; i < studyIDs.length; i++) {
        studyIDs[i] = "\"" + studyIDs[i] + "\"";
    }

    sql.query(`SELECT * FROM study_table WHERE studyID IN (${studyIDs})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`studies queried by IDs, ${res.length} result(s)`);
        result(null, res);
    });
};

Study.findStudy = (searchStr, result) => {
    sql.query(`SELECT * FROM study_table WHERE citation LIKE '%${searchStr}%' OR title LIKE '%${searchStr}%'`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`find studies queried with '${searchStr}', ${result.length} result(s)`);
        result(null, res);
    });
};

module.exports = Study;