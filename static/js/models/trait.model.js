const sql = require('./database')

const Trait = function(mtrait) {
    this.trait = mtrait.trait;
    this.studyID = mtrait.studyID;
};

Trait.getAll = result => {
    sql.query("SELECT * FROM trait_table", (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`All traits queried, ${res.length} result(s)`);
        result(null, res);
    });
};

Trait.findTrait = (searchStr, result) => {
    sql.query(`SELECT * FROM trait_table WHERE trait LIKE '%${searchStr}%'`, (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
        }

        console.log(`find traits queried with '${searchStr}', with ${res.length} result(s)`);
        result(null, res);
    });
};

module.exports = Trait;
