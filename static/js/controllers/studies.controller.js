const Study = require("../models/study.model.js");

// get all traits from the database, returns a list of traits
exports.getTraits = (req, res) => {
    Study.getTraits((err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving traits."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            traits = []
            for (i=0; i<data.length; i++) {
                traits.push(data[i].trait)
            }

            res.send(traits);
        }
    })
}

exports.findTraits = (req, res) => {
    Study.findTraits(req.params.searchStr, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving traits."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            traits = []
            for (i=0; i<data.length; i++) {
                traits.push(data[i].trait)
            }

            res.send(traits);
        }
    });
};

exports.getAll = (req, res) => {
    Study.getAll((err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving studies."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    });
};

exports.getByTypeAndTrait = (req, res) => {
    traits = req.query.traits
    studyTypes = req.query.studyTypes
    console.log("getting studies");
    Study.getByTypeAndTrait(traits, studyTypes, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving studies"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            traitsList = {}
            
            if (data.length == 1) {
                traitsList[data[0].trait] = [data[0]]
            }

            else {
                for (i=0; i<data.length; i++) {
                    for (j=0; j<data[i].length; j++) {
                        if (data[i][j].trait in traitsList) {
                            traitsList[data[i][j].trait].push(data[i][j])
                        }
                        else {
                            traitsList[data[i][j].trait] = [data[i][j]]
                        }
                    }
                }
            }

            res.send(traitsList);
        }
    });
};

exports.findStudies = (req, res) => {
    Study.findStudy(req.params.searchStr, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving studies"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    });
};