const Trait = require("../models/trait.model.js");

// get all traits from the database
exports.getAll = (req, res) => {
    Trait.getAll((err, data) => {
        if (err) 
        res.status(500).send({
            message:
            err.message || "Error occured while retrieving traits."
        });
        else {
            traits = {}
            for ( i=0; i < data.length; i++) {
                traits[data[i].trait] = {studyIDs: data[i].studyIDs.split("|")}
            }
    
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(traits);
        }
    });
};

exports.findTraits = (req, res) =>{
    Trait.findTrait(req.params.searchStr, (err, data) => {
        if (err) 
        res.status(500).send({
            message:
            err.message || "Error occured while retrieving traits."
        });
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            traits = {}
            for ( i=0; i < data.length; i++) {
                traits[data[i].trait] = {studyIDs: data[i].studyIDs.split("|")}
            }
    
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(traits);
        }
    })
};
