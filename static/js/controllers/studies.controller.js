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
            traits = new Set()
            for (i=0; i<data.length; i++) {
                traits.add(data[i].trait)
                traits.add(data[i].reportedTrait)
            }

            res.send(Array.from(traits).sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            }));
        }
    })
}

exports.getEthnicities = (req, res) => {
    Study.getEthnicities((err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving ethnicities."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            ethnicities = []
            for (i=0; i<data.length; i++) {
                ethnicityString = data[i].ethnicity
                ethnicityList = ethnicityString.split("|")
                for (j=0; j<ethnicityList.length; j++){
                    if (ethnicityList[j].toLowerCase() != "na" && ethnicityList[j] != "" && !(ethnicities.includes(ethnicityList[j]))) {
                        ethnicities.push(ethnicityList[j])
                    }
                }
            }

            res.send(ethnicities.sort());
        }
    })
}

exports.findTraits = (req, res) => {
    Study.findTrait(req.params.searchStr, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving traits."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            traits = new Set()
            for (i=0; i<data.length; i++) {
                for (j=0; j<data[i].length; j++) {
                    if (typeof(data[i][j].trait) !== "undefined") {
                        traits.add(data[i][j].trait)
                    }
                    else {
                        traits.add(data[i][j].reportedTrait)
                    }
                }
            }

            res.send(Array.from(traits).sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            }));
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

exports.getFiltered = (req, res) => {
    traits = req.body.traits
    studyTypes = req.body.studyTypes
    ethnicities = req.body.ethnicities
    console.log("getting studies");
    Study.getFiltered(traits, studyTypes, ethnicities, (err, data) => {
        if (err) {
            res.status(500).send({
                message: "Error retrieving studies"
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            traitsList = {}
            
            for (i=0; i<data.length; i++) {
                if (Array.isArray(data[i])){
                    for (j=0; j<data[i].length; j++) {
                        if (data[i][j].trait in traitsList) {
                            traitsList[data[i][j].trait].push(data[i][j])
                        }
                        else {
                            traitsList[data[i][j].trait] = [data[i][j]]
                        }
                    }
                }
                else {
                    if (data[i].trait in traitsList) {
                        traitsList[data[i].trait].push(data[i])
                    }
                    else {
                        traitsList[data[i].trait] = [data[i]]
                    }
                }
            }

            res.send(traitsList);
        }
    });
};

exports.getByID = (req, res) => {
    Study.getByID(req.params.studyIDs, (err, data) => {
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
}

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