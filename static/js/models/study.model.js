const sql = require('./database')

const Study = function (mstudy) {
    this.studyID = mstudy.studyID,
    this.pubMedID = mstudy.pubMedID,
    this.trait = mstudy.trait,
    this.reportedTrait = mstudy.reportedTrait,
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
    sql.query(`SELECT DISTINCT trait, reportedTrait FROM study_table WHERE (trait LIKE '%${searchStr}%' OR reportedTrait LIKE '%${searchStr}%') `, (err, res) => {
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

Study.getFiltered = (traits, studyTypes, ethnicities, result) => {
    //if traits is null, assume they want all 
    if (traits) {
        if (typeof traits === 'string' || traits instanceof String) {
            traits = "\"" + traits + "\"";
        }
        else {
            for (i = 0; i < traits.length; i++) {
                traits[i] = "\"" + traits[i] + "\"";
            }
        }
        
        // studyMaxes is a view in the database used to find the max values we need 
        studyMaxQuery = `SELECT * FROM studyMaxes WHERE (trait IN (${traits}) OR reportedTrait IN (${traits}))`
    }
    else {
        studyMaxQuery = `SELECT * FROM studyMaxes`
    }

    sql.query(studyMaxQuery, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }
        var sqlQueryString = "";
        for (i = 0; i < res.length; i++) {
            //format NA values correctly
            if (res[i].cohort == "NA") {
                res[i].cohort = `\"${res[i].cohort}\"`
            }
            if (res[i].studyScore == "NA") {
                res[i].studyScore = `\"${res[i].studyScore}\"`
            }

            //subQueryString is the string that we append query constraints to from the HTTP request
            var subQueryString = `SELECT * FROM study_table WHERE (trait = "${res[i].trait}" OR reportedTrait = "${res[i].trait}") `;
            var appendor = "";

            //append sql conditional filters for studyType
            if(studyTypes){
                appendor = "AND (";
                if (studyTypes.includes("LC")) {
                    subQueryString = subQueryString.concat(appendor).concat(` cohort = ${res[i].cohort} `);
                    appendor = "OR";
                }
                if (studyTypes.includes("HI")) {
                    subQueryString = subQueryString.concat(appendor).concat(` studyScore = ${res[i].studyScore} `);
                    appendor = "OR";
                }
                if (studyTypes.includes("O")) {
                    subQueryString = subQueryString.concat(appendor).concat(` studyScore <> ${res[i].studyScore} AND  cohort <> ${res[i].cohort} `);
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
                        subQueryString = subQueryString.concat(appendor).concat(` ethnicity LIKE '%${ethnicities[j]}%' `);
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

        console.log(sqlQueryString)

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
    // search by citation, title, or pubMedID
    sql.query(`SELECT * FROM study_table WHERE citation LIKE '%${searchStr}%' OR title LIKE '%${searchStr}%' OR pubMedID LIKE '%${searchStr}%'`, (err, res) => {
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