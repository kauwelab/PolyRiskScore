module.exports = app => {
    const traits = require("../controllers/traits.controller");
    const studies = require("../controllers/studies.controller");
    const associations = require("../controllers/associations.controller");

    // Retrieve all traits -> see trait.model.js for format
    app.get("/get_traits", traits.getAll);

    // Searches for traits using search string
    app.get("/find_traits/:searchStr", traits.findTraits);

    app.get("/get_all_studies", studies.getAll);

    // Retrieves study general data for specified studies
    app.get("/get_studies", studies.getByIds);

    app.get("/find_studies/:searchStr", studies.findStudies);

    // Retrieves applicable associations given correct query parameters -> see association.model.js
    app.get("/get_associations", associations.getFromTable);

    //app.get("/all_associations", associations.getAll);
}