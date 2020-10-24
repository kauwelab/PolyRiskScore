const Ukbbdata = require("../models/ukbbdata.model.js");

exports.getSummaryResults = (req, res) => {
    Ukbbdata.getSummaryResults(req.params.studyIDs, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    })
}

exports.getFullResults = (req, res) => {
    Ukbbdata.getFullResults(req.params.studyIDs, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    })
}
