const sql = require('./database')

const Study = function(mstudy) {
    this.studyID = mstudy.studyID,
    this.pubMedID = mstudy.pubMedID,
    this.trait = mstudy.trait,
    this.citation = mstudy.citation,
    this.studyScore = mstudy.studyScore,
    this.ethnicity = mstudy.ethnicity,
    this.cohort = mstudy.cohort,
    this.title = mstudy.title,
    this.lastUpdated = mstudy.lastUpdated,
    this.studyType = mstudy.studyType
}

Study.getTraits = result => {
    sql.query("SELECT DISTINCT trait FROM study_table ORDER BY trait", (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`All traits queried, ${res.length} result(s)`);
        result(null, res);
    });
};

Study.getEthnicities = (result) => {
    sql.query(`SELECT DISTINCT ethnicity FROM study_table`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log(`${res.length} ethnicity result(s)`);
        result(null, res);
    });
}

Study.findTrait = (searchStr, result) => {
    sql.query(`SELECT DISTINCT trait FROM study_table WHERE trait LIKE '%${searchStr}%'`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`find traits queried with '${searchStr}', with ${res.length} result(s)`);
        result(null, res);
    });
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

Study.getByTypeAndTrait = (traits, studyTypes, result) => {

    for (i=0; i < traits.length; i++) {
        traits[i] = "\"" + traits[i] + "\"";
    }

    // studyMaxes is a view in the database used to find the max values we need 
    sql.query(`SELECT * FROM studyMaxes WHERE trait IN (${traits})`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        sqlQueryString = ""
        for (i=0; i<res.length; i++) {
            if (studyTypes.includes("LC")) {
                if (res[i].cohort == "NA") {
                    res[i].cohort = `\"${res[i].cohort}\"`
                }
                sqlQueryString = sqlQueryString.concat(`SELECT *, "LC" as studyType FROM study_table WHERE trait = "${res[i].trait}" AND cohort = ${res[i].cohort}; `)
            }
            if (studyTypes.includes("HI")) {
                if (res[i].studyScore == "NA") {
                    res[i].studyScore = `\"${res[i].studyScore}\"`
                }
                sqlQueryString = sqlQueryString.concat(`SELECT *, "HI" as studyType FROM study_table WHERE trait = "${res[i].trait}" AND studyScore = ${res[i].studyScore}; `)
            }
            if (studyTypes.includes("O")) {
                if (res[i].cohort == "NA") {
                    res[i].cohort = `\"${res[i].cohort}\"`
                }
                if (res[i].studyScore == "NA") {
                    res[i].studyScore = `\"${res[i].studyScore}\"`
                }
                sqlQueryString = sqlQueryString.concat(`SELECT *, "O" as studyType FROM study_table WHERE trait = "${res[i].trait}" AND studyScore <> ${res[i].studyScore} AND cohort <> ${res[i].cohort}; `)
            }
        }

        console.log(`traits queried, ${res.length} result(s)`);
        sql.query(sqlQueryString, (err, data) => {
            if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
            }
            console.log(`studies queried, ${data.length} result(s)`)
            result(null, data) 
        });
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