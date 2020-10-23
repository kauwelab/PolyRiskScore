const sql = require('./database')

const Ukbbdata = function (mUkbbdata) {
    this.studyID = mUkbbdata.studyID
}

Ukbbdata.template = (test, result) => {
    sqlStatement = `SELECT testData FROM ukbb_table WHERE column = ?`
    sql.query(sqlStatement, [test], (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        result(null, res);
    })
}

module.exports = Ukbbdata;
