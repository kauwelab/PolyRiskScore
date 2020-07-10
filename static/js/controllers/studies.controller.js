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

exports.getFiltered = (req, res) => {
    traits = req.query.traits
    studyTypes = req.query.studyTypes
    ethnicities = req.query.ethnicities
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