module.exports = app => {
    const studies = require("../controllers/studies.controller");
    const associations = require("../controllers/associations.controller");
    const clumps = require("../controllers/clumps.controller");
    const cli = require("../controllers/cli.controller");

    // Retrieve all traits 
    // returns a list of trait objects -> see trait.model.js for format
    app.get("/get_traits", studies.getTraits);

    app.get("/ethnicities", studies.getEthnicities);

    // Searches for traits using search string
    app.get("/find_traits/:searchStr", studies.findTraits);

    // Retrieves all studies from the study_table
    app.get("/get_all_studies", studies.getAll);

    // Retrieves study general data for specified studies
    app.post("/get_studies", studies.getFiltered);

    //searches for study titles or citations containing the given search string
    app.get("/find_studies/:searchStr", studies.findStudies);

    // Retrieves applicable associations given correct query parameters -> see association.model.js
    app.post("/get_associations", associations.getFromTables);

    // Returns all associations for all traits and diseases, given the correct query params
    // organized {trait: {studies: [associations]}}
    app.get("/all_associations", associations.getAll);

    app.get("/all_snps", associations.getAllSnps);

    app.get("/single_snp_from_each_study", associations.getSingleSnpFromEachStudy)

    app.get("/search_for_missing_snps", associations.searchMissingRsIDs)

    app.get("/snps_by_ethnicity", associations.snpsByEthnicity)

    app.get("/last_database_update", associations.getLastAssociationsUpdate)

    // Gets the clumping numbers for studies and ethnicities
    app.get("/ld_clumping", clumps.getClumping);

    app.post("/ld_clumping_by_pos", clumps.getClumpingByPos);

    app.post("/ld_clumping_by_snp", clumps.getClumpingBySnp);

    app.get("/cli_version", cli.version);

    app.get("/download_cli", cli.download);

    app.get("/join_test", associations.joinTest)
}
