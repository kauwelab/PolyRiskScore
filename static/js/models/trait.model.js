const sql = require('./database')

const Trait = function(trait) {
    this.traitId = trait.traitId;
    this.traitName = trait.traitName;
    this.studies = trait.studies;
};

Trait.getAll = result => {
    sql.query("SELECT * FROM traitTable", (err, res) => {
        if (err) {
            console.log("error: ", err);
            result(null, err);
            return;
        }

        console.log("customers: ", res);
        result(null, res);
    });
};