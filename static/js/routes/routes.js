module.exports = app => {
    const studies = require("../controllers/studies.controller");
    const associations = require("../controllers/associations.controller");
    const clumps = require("../controllers/clumps.controller");
    const cli = require("../controllers/cli.controller");
    const cohortdata = require("../controllers/cohortdata.controller");
    const errors = require("../controllers/errors.controller");
    const maf = require("../controllers/maf.controller");

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

    app.get("/snps_to_chrom_pos", associations.getSnpsToChromPos);

    app.get("/all_snps_to_studyIDs", associations.getAllSnpsToStudyIDs);

    app.post("/snps_to_trait_studyID", associations.getSnpsToTraitStudyID);

    app.get("/single_snp_from_each_study", associations.getSingleSnpFromEachStudy)

    app.get("/search_for_missing_snps", associations.searchMissingRsIDs)

    app.get("/snps_by_ethnicity", associations.snpsByEthnicity)

    app.get("/last_database_update", associations.getLastAssociationsUpdate)

    app.get("/get_associations_download_file", associations.getAssociationsDownloadFile)

    app.get("/get_traitStudyID_to_snp", associations.getTraitStudyIDToSnpsDownloadFile)

    // Gets the clumping numbers for studies and ethnicities

    app.post("/ld_clumping_by_pos", clumps.getClumpingByPos);

    app.get("/get_clumps_download_file", clumps.getClumpsDownloadFile)

    app.get("/last_clumps_update", clumps.getLastClumpsUpdate);

    app.get("/cli_version", cli.version);

    app.get("/download_cli", cli.download);

    app.get("/cohort_get_traits", cohortdata.getTraits);

    app.get("/cohort_get_studies", cohortdata.getStudies);

    app.get("/cohort_get_cohorts", cohortdata.getCohorts);

    app.get("/cohort_summary_results", cohortdata.getSummaryResults);

    app.get("/cohort_full_results", cohortdata.getFullResults);

    app.get("/cohort_study_snps", cohortdata.getStudySnps);

    app.post("/get_percentiles", cohortdata.getPercentiles);

    app.get("/last_percentiles_update", cohortdata.getLastPercentilesUpdate);

    app.get("/get_percentiles_download_file", cohortdata.getDownloadPercentiles);

    app.post("/get_maf", maf.getMaf);

    app.get("/get_all_maf", maf.getAllMaf);

    app.get("/last_maf_update", maf.getLastMAFupdate);

    app.get("/get_maf_download_file", maf.getDownloadMaf);

    app.get("/last_maf_update", maf.getLastMafUpdate);

    app.post("/send_error", errors.sendError);

    app.get("/download_errors", errors.downloadErrors);

    app.get("/join_test", associations.joinTest);
}
