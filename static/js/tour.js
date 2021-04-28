var tour;
var templateWithoutNext = `<div class='popover tour'> 
<div class='arrow'></div>
<h3 class='popover-header'></h3> 
<div class="popover-body"></div> 
<div class="popover-navigation"> 
    <div class="btn-group"> 
        <button class="btn btn-sm btn-primary" data-role="prev">« Prev</button> 
    </div> 
    <button class="btn btn-sm btn-primary" data-role="end">End tour</button> 
</div> 
</div>`
var refGenTourIndex = 3
var superPopTourIndex = 4
var sexTourIndex = 5
var gwasFileTourIndex = 10
var gwasRefGenTourIndex = 11



function startTour() {
    // Instance the tour
    tour = new Tour({
        template: `<div class='popover tour'> 
                <div class='arrow'></div>
                <h3 class='popover-header'></h3> 
                <div class="popover-body"></div> 
                <div class="popover-navigation"> 
                    <div class="btn-group"> 
                        <button class="btn btn-sm btn-primary" data-role="prev">« Prev</button> 
                        <button class='btn btn-sm btn-primary' data-role='next'>Next »</button>
                    </div> 
                    <button class="btn btn-sm btn-primary" data-role="end">End tour</button> 
                </div> 
                </div>`,
        steps: [
            {
                element: "#startTour",
                title: "Welcome to PRSKB!",
                content: "Calculating polygenic risk scores with PRSKB is easy! This is a brief tutorial to get you started."
            },
            {
                element: "#feedbackForm",
                title: "Input your data",
                content: "Data can be input either by typing dbSNP reference SNP IDs (rsIDs) and alleles directly on the page using the \"Text Input\" button \
                (see examples in the text box) or by uploading a VCF file using the \"File Upload\" button. Note: zipped files are only \
                supported on the CLI version of PRSKB."
            },
            {
                element: "#exampleInput",
                title: "Let's try it!",
                content: "For now, press the \"Example\" button to preload the website with an example VCF.",
                reflex: true,
                template: templateWithoutNext
            },
            {
                element: "#refGenome",
                title: "Select reference genome",
                content: "Select the reference genome corresponding to the VCF you have uploaded. \
                Choose the \"GRCh37/hg19\" option for the example VCF.",
                template: templateWithoutNext
            },
            {
                element: "#superPopSelect",
                title: "Select super population of individual(s) in your VCF file.",
                content: "This will be used to perform LD clumping on your data (see the Learn More \
                page). If you are unsure about the super population of the individual(s) in your file, \
                choose the one you believe to be the most accurate.",
                template: templateWithoutNext
            },
            {
                element: "#sex",
                title: "Select the sex of the individuals in your VCF file.",
                content: "This will be used to select odds ratios and p-values to use when there \
                are multiple odds ratios available for the same SNP due to them being associated \
                with biological sex. This is not a common occurence. Our system defaults to \
                female. When you are done, press the \"next\" button to continue the tour."
            },
            {
                element: "#GWAStypeSelector",
                title: "GWAS",
                content: "Users have the option of either calculating polygenic risk scores from \
                GWAS data in the database or uploading their own GWAS data. Choose which one you \
                would like to use."
            },
            {
                element: "#traitSelectContainer",
                title: "Select traits",
                content: "Use the search bar to search specific traits for which you would like to \
                calulate polygenic risk scores. Click on one or more traits to include them in your \
                results. Note: you can select all traits using the \"Select all\" button. However, \
                calculations may take some time depending on the size of your VCF file. When you are\
                done selecting traits, press the \"next\" button to continue the tour.",
            },
            {
                element: "#applyFilters",
                title: "Select additional study filters",
                content: "Studies about the traits you selected can be further filtered by choosing \
                study type or study ethnicity. \"High impact\" is measured by Altmetric score while \
                \"large cohort\" is measured \ by the size of a study's initial sample size plus its \
                replication sample size. Once you have \ finished selecting your filters, press the \
                \"Apply Filters\" button to update the studies list.",
                reflex: true,
                template: templateWithoutNext
            },
            {
                element: "#studySelectContainer",
                title: "Select studies",
                content: "Search and select studies to include in your results. A separate polygenic risk score \
                will be calculated for each study/trait pair. Once you have finished selecting your filters, press \
                the \"next\" button to continue the tour."
            },
            {
                element: "#exampleGWASInput",
                title: "Upload a GWAS file",
                content: "See the above paragraph for the requirements for uploading GWAS data. For this tour, select the example file.",
                reflex: true,
                template: templateWithoutNext
            },
            {
                element: "#gwasRefGenome",
                title: "Select the reference genome of the uploaded GWAS data",
                content: "Select the reference genome corresponding to the GWAS data you have uploaded. For the example GWAS file, select the 'GRCh38/hg38' option.",
                template: templateWithoutNext
            },
            {
                element: "#pvalInput",
                title: "Enter p-value cutoff",
                content: "Enter the p-value cutoff for odds ratios you wish to include in your polygenic risk score \
                using the two text boxes."
            },
            {
                element: "#fileType",
                title: "Select output format (pt 1)",
                content: "Choose between TSV or JSON output format."
            },
            {
                element: "#fileFormat",
                title: "Select output format (pt 2)",
                content: "Choose either a condensed results version or a full results version. The condensed version displays \
                the polygenic risk scores for each sample for each trait/study combination. The full version additionally gives \
                information for each sample on which SNPs contribute to the trait, which are protective against the trait, and \
                which are neutral or have unknown contributions."
            },
            {
                element: "#feedbackSubmit",
                title: "Click the calculate button",
                content: "It's a simple as that!",
                reflex: true,
                template: templateWithoutNext
            },
            {
                element: "#responseBox",
                title: "Results",
                content: "See a summary of your results here..."
            },
            {
                element: "#downloader",
                title: "Download results",
                content: "...or download the full results here."
            },
            {
                element: "#startTour",
                title: "You're all set!",
                content: "Now give it a try with your own data! If you have any questions, contact us at kauwelab19@gmail.com",
                template: templateWithoutNext
            }
        ]
    });

    // Clear bootstrap tour session data
    localStorage.removeItem('tour_current_step');
    localStorage.removeItem('tour_end');

    // Initialize the tour
    tour.init();

    // Start the tour
    tour.start();
}

/**
 * Advances the tour if currently going and if the stepName matches 
 * @param {*} stepName- currently only expected to be "refGen" (we can add other steps later), corresponding to refGenTourIndex
 */
function moveToNextTourIndex(stepName) {
    //if the tour has been initialized before (isn't undefinded)
    if (typeof tour !== "undefined") {
        //check if the tour is at the refGen selection point to prevent advances at the wrong times 
        if ((stepName == "refGen" && tour.getCurrentStep() == refGenTourIndex)) {
            tour.next()
        }
        if ((stepName == 'sex' && tour.getCurrentStep() == sexTourIndex)) {
            tour.next()
        }
        if ((stepName == 'superPop' && tour.getCurrentStep() == superPopTourIndex)) {
            tour.next()
        }
        if ((stepName == 'gwasFile' && tour.getCurrentStep() == gwasFileTourIndex)) {
            tour.next()
        }
        if ((stepName == 'gwasRefGenome' && tour.getCurrentStep() == gwasRefGenTourIndex)) {
            tour.next()
        }
    }
}
