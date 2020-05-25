module.exports = app => {
    const traits = require("../controllers/traits.controller");

    // Retrieve all traits
    app.get("/traits", traits.getAll);
}