const cohortdata = require("../models/cohortdata.model.js");

exports.getTraits = (req, res) => {
    cohortdata.getTraits((err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            //todo need to test
            returnData = []
            for (i = 0; i < data.length; i++) {
                returnData.push(data[i].trait)
            }
            res.send(returnData);
        }
    })
}

exports.getStudies = (req, res) => {
    cohortdata.getStudies(req.query.trait, req.query.studyTypes, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            // ensure that we are only returning studies for which we have data in the cohort table
            studiesFromStudyTable = data[0]
            studyDataFromCohortTable = data[1]
            studyIDsFromCohortTable = []
            studiesToReturn = []

            for (i=0; i<studyDataFromCohortTable.length; i++) {
                studyIDsFromCohortTable.push(studyDataFromCohortTable[i].studyID)
            }

            for (i=0; i<studiesFromStudyTable.length; i++) {
                if (studyIDsFromCohortTable.includes(studiesFromStudyTable[i].studyID)) {
                    studiesToReturn.push(studiesFromStudyTable[i])
                }
            }

            res.send(studiesToReturn);
        }
    })
}

exports.getCohorts = (req, res) => {
    cohortdata.getCohorts(req.query.studyID, req.query.trait, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving cohort data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            returnData = []
            for (i = 0; i < data.length; i++) {
                returnData.push(data[i].cohort.toLowerCase())
            }
            res.send(returnData);
        }
    })
}

exports.getSummaryResults = (req, res) => {
    cohortdata.getSummaryResults(req.query.studyID, req.query.trait, req.query.cohort, (err, data) => {
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
    cohortdata.getFullResults(req.query.studyID, req.query.trait, req.query.cohort, (err, data) => {
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

exports.getStudySnps = (req, res) => {
    cohortdata.getStudySnps(req.query.studyID, req.query.trait, req.query.cohort, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving data."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            console.log(data)
            snps = data[0]['snps'].split("|")
            res.send(snps);
        }
    })
}
