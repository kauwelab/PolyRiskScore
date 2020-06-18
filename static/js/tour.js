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
var traitTourIndex = 3
var refGenTourIndex = 4

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
                content: "Data can be input either by typing SNP IDs and alleles directly on the page using the \"Text Input\" button \
                (see examples in the text box) or by uploading a VCF file using the \"File Upload\" button."
            },
            {
                element: "#exampleInput",
                title: "Let's try it!",
                content: "For now, press the \"Example\" button to preload the website with an example VCF.",
                reflex: true,
                template: templateWithoutNext
            },
            {
                element: "#diseaseStudy",
                title: "Select traits and studies",
                content: "Select the traits and studies for which you would like to calulate polygenic risk scores. \
                Note: selecting all traits may take some time depending on the size of your VCF file.",
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
                element: "#pvalInput",
                title: "Enter p value cutoff",
                content: "Enter the p value cutoff for odds ratios you wish to include in your polygenic risk score \
                using the two text boxes."
            },
            {
                element: "#fileType",
                title: "Select output format",
                content: "Choose between CSV, JSON, or Text output format."
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
                content: "Now give it a try with your own data! If you have any questions, contact us using the form at the bottom of the homepage.",
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
 * @param {*} stepName- either "trait" or "refGen", corresponding to traitTourIndex and refGenTourIndex respectively
 */
function moveToNextTourIndex(stepName) {
    //check if the tour is at the trait selection or refGen selection point to 
    //prevent advances at the wrong times 
    if ((stepName == "trait" && tour.getCurrentStep() == traitTourIndex) || (stepName == "refGen" && tour.getCurrentStep() == refGenTourIndex)) {
        tour.next()
    }
}