module.exports = app => {
    const studies = require("../controllers/studies.controller");
    const associations = require("../controllers/associations.controller");
    const clumps = require("../controllers/clumps.controller");
    const cli = require("../controllers/cli.controller");
    const ukbbdata = require("../controllers/ukbbdata.controller");

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

    app.get("/get_studies_by_id", studies.getByID);

    //searches for study titles or citations containing the given search string
    app.get("/find_studies/:searchStr", studies.findStudies);

    app.get("/download_study_table", studies.downloadStudyTable);

    // Retrieves applicable associations given correct query parameters -> see association.model.js
    app.post("/get_associations", associations.getFromTables);

    // Returns all associations for all traits and diseases, given the correct query params
    app.get("/all_associations", associations.getAll);

    app.get("/all_snps", associations.getAllSnps);

    app.get("/all_snps_to_studyIDs", associations.getAllSnpsToStudyIDs);

    app.post("/snps_to_trait_studyID", associations.getSnpsToTraitStudyID);

    app.get("/single_snp_from_each_study", associations.getSingleSnpFromEachStudy)

    app.get("/search_for_missing_snps", associations.searchMissingRsIDs)

    app.get("/snps_by_ethnicity", associations.snpsByEthnicity)

    app.get("/last_database_update", associations.getLastAssociationsUpdate)

    app.get("/get_associations_download_file", associations.getAssociationsDownloadFile)

    app.get("/get_traitStudyID_to_snp", associations.getTraitStudyIDToSnpsDownloadFile)

    // Gets the clumping numbers for studies and ethnicities
    app.get("/ld_clumping", clumps.getClumping);

    app.post("/ld_clumping_by_pos", clumps.getClumpingByPos);

    app.post("/ld_clumping_by_snp", clumps.getClumpingBySnp);

    app.get("/get_clumps_download_file", clumps.getClumpsDownloadFile)

    app.get("/last_clumps_update", clumps.getLastClumpsUpdate);

    app.get("/cli_version", cli.version);

    app.get("/download_cli", cli.download);

    app.get("/ukbb_get_traits", ukbbdata.getTraits);

    app.get("/ukbb_get_studies", ukbbdata.getStudies);

    app.get("/ukbb_summary_results", ukbbdata.getSummaryResults);

    app.get("/ukbb_full_results", ukbbdata.getFullResults);

    app.get("/ukbb_study_snps", ukbbdata.getStudySnps);

    app.get("/join_test", associations.joinTest);
}
