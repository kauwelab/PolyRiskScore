const sql = require('./database')

const Study = function (mstudy) {
    this.studyID = mstudy.studyID,
    this.pubMedID = mstudy.pubMedID,
    this.trait = mstudy.trait,
    this.reportedTrait = mstudy.reportedTrait,
    this.citation = mstudy.citation,
    this.altmetricScore = mstudy.altmetricScore,
    this.ethnicity = mstudy.ethnicity,
    this.initialSampleSize = mstudy.initialSampleSize,
    this.replicationsSampleSize = mstudy.replicationSampleSize,
    this.title = mstudy.title,
    this.lastUpdated = mstudy.lastUpdated,
    this.studyType = mstudy.studyType
}

Study.getTraits = result => {
    sql.query("SELECT DISTINCT trait, reportedTrait FROM study_table ORDER BY trait", (err, res) => {
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
    searchString = `%${searchStr}%`
    sql.query(`SELECT DISTINCT trait FROM study_table WHERE (trait LIKE ?) ; SELECT DISTINCT reportedTrait FROM study_table WHERE (reportedTrait LIKE ?); `, [searchString, searchString], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`find traits queried with '${searchStr}', with ${res[0].length} and ${res[1].length} result(s)`);
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

Study.getFiltered = (traits, studyTypes, ethnicities, result) => {
    // use for adding the correct number of ? for using parameterization for the traits
    sqlQuestionMarks = ""

    // potentially change the output format??
    //if traits is null, assume they want all 
    if (traits) {
        if (Array.isArray(traits)) {
            for (i = 0; i < traits.length - 1; i++) {
                sqlQuestionMarks = sqlQuestionMarks.concat("?, ")
            }
        }
        sqlQuestionMarks = sqlQuestionMarks.concat("?")
        
        // studyMaxes is a view in the database used to find the max values we need 
        studyMaxQuery = `SELECT * FROM studyMaxes WHERE trait IN (${sqlQuestionMarks})`
    }
    else {
        studyMaxQuery = `SELECT * FROM studyMaxes`
    }

    // the query, the array of items to fill in the question marks, the callback function
    sql.query(studyMaxQuery, traits, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        var sqlQueryString = "";
        sqlQueryParams  = []
        for (i = 0; i < res.length; i++) {

            //subQueryString is the string that we append query constraints to from the HTTP request
            var subQueryString = `SELECT * FROM study_table WHERE ( trait = ? OR reportedTrait = ? ) `;
            sqlQueryParams.push(res[i].trait)
            sqlQueryParams.push(res[i].trait)
            var appendor = "";

            //append sql conditional filters for studyType
            if(studyTypes){
                appendor = "AND (";
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
            }

            //append sql conditional filters for ethnicity
            if (ethnicities) {
                appendor = "AND (";
                for(j=0; j < ethnicities.length; j++){
                    //TODO check for "unspecified/blank" ethnicity studies
                    if (ethnicities[j] == "unspecified") {
                        subQueryString = subQueryString.concat(appendor).concat(` ethnicity = '' OR ethnicity = ' ' `);
                        appendor = "OR";
                    }
                    else {
                        subQueryString = subQueryString.concat(appendor).concat(` ethnicity LIKE ? `);
                        sqlQueryParams.push(`%${ethnicities[j]}%`)
                        appendor = "OR";
                    }
                }
                //if the appendor has been updated, then close the parenthesis
                if (appendor !== "AND (") {
                    subQueryString = subQueryString.concat(") ")
                }
            }
            subQueryString = subQueryString.concat("; ")
            sqlQueryString = sqlQueryString.concat(subQueryString);
        }
        console.log(`traits queried, ${res.length} result(s)`);

        sql.query(sqlQueryString, sqlQueryParams, (err, data) => {
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

Study.getByID = (studyIDs, result) => {
    sqlQMarks = ''
    if (Array.isArray(studyIDs)){
        for (i = 0; i < studyIDs.length - 1; i++) {
            sqlQMarks = sqlQMarks.concat("?, ")
        }
    }
    else {
        studyIDs = [studyIDs]
    }
    sqlQMarks = sqlQMarks.concat("?")

    sql.query(`SELECT * FROM study_table WHERE studyID IN (${sqlQMarks}) ;`, studyIDs,  (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`find studies queried by ID, ${res.length} result(s)`);
        result(null, res);
    });
}

Study.findStudy = (searchStr, result) => {
    // search by citation, title, or pubMedID
    searchString = `%${searchStr}%`
    sql.query(`SELECT * FROM study_table WHERE citation LIKE ? OR title LIKE ? OR pubMedID LIKE ? ;`, [searchString, searchString, searchString],  (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`find studies queried with '${searchStr}', ${res.length} result(s)`);
        result(null, res);
    });
};

module.exports = Study;
