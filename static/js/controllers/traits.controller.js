const Trait = require("../models/trait.model.js");

// get all traits from the database
exports.getAll = (req, res) => {
    Trait.getAll((err, data) => {
        if (err) 
        res.status(500).send({
            message:
            err.message || "Error occured while retrieving traits."
        });
        else res.send(data);
    });
};