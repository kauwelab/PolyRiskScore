const Ukbbdata = require("../models/ukbbdata.model.js");

exports.template = (req, res) => {
    Ukbbdata.template(req.params.test, (err, data) => {
        if (err) {
            res.status(500).send({
                message:
                err.message || "Error occured while retrieving traits."
            });
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.send(data);
        }
    })
}
