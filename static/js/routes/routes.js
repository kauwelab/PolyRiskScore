module.exports = app => {
    const studies = require("../controllers/studies.controller");
    const associations = require("../controllers/associations.controller");

    // Retrieve all traits 
    // returns a list of trait objects -> see trait.model.js for format
    app.get("/get_traits", studies.getTraits);

    app.get("/ethnicities", studies.getEthnicities);

    // Searches for traits using search string
    app.get("/find_traits/:searchStr", studies.findTraits);

    // Retrieves all studies from the study_table
    app.get("/get_all_studies", studies.getAll);

    // Retrieves study general data for specified studies
    app.get("/get_studies", studies.getByTypeAndTrait);

    // Retrieves study data using a list of study ids
    app.get("/get_studies_by_id", studies.getStudyByID);

    //searches for study titles or citations containing the given search string
    app.get("/find_studies/:searchStr", studies.findStudies);

    // Retrieves applicable associations given correct query parameters -> see association.model.js
    app.get("/get_associations", associations.getFromTables);

    // Returns all associations for all traits and diseases, given the correct query params
    // organized {trait: {studies: [associations]}}
    app.get("/all_associations", associations.getAll);

    app.get("/all_snps", associations.getAllSnps);
}