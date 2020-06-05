const Study = require("../models/study.model.js");

// get all traits from the database
exports.getAll = (req, res) => {
    Study.getAll((err, data) => {
        if (err) 
        res.status(500).send({
            message:
            err.message || "Error occured while retrieving studies."
        });
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    });
};

exports.getByIds = (req, res) => {
    Study.getByIds(req.query.studyIDs, (err, data) => {
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