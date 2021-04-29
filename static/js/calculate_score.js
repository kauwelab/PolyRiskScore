var resultJSON = "";
var unusedTraitStudyArray = [];
var traitsList = []
//if false, the VCF button is selected- used as a toggle to prevent action on double click
var textButtonSelected = true;

// ensure that they know they need to reupload the file by clearing the input area
function pageReset() {
    var textInput = document.getElementById('input');
    textInput.value = ""

    document.getElementById("database").checked = true;
    document.getElementById("gwasDatabase").style.display = "initial";
    document.getElementById("gwasUpload").style.display = "none";
}

//updates the output box and resultJSON string with the new string
function updateResultBoxAndStoredValue(str) {
    $('#response').html(str);
    resultJSON = str
}

/**
 * Currently unused. Sets the the result box of the Calculate page to str and updates the resultJSON to the new text
 * @param {*} str 
 */
function addToResultBox(str) {
    newText = document.getElementById('response').innerHTML.concat('\n', str);
    $('#response').html(newText);
    resultJSON = newText
}

/**
 * Populates the trait drop down with traits from the PRSKB database
 */
function getTraits() {
    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#traitSelect').replaceWith("<select id='traitSelect' multiple></select>");

    //call the API and populate the traits dropdown/multiselct with the results
    $.ajax({
        type: "GET",
        url: "get_traits",
        success: async function (data) {
            traitsList = data;
            var selector = document.getElementById("traitSelect");
            for (i = 0; i < traitsList.length; i++) {
                var opt = document.createElement('option')
                opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(traitsList[i])))
                opt.value = traitsList[i]
                selector.appendChild(opt);
            }
            document.multiselect('#traitSelect');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the traits: ${XMLHttpRequest.responseText}`);
        }
    })
}

/**
 * Populates the ethnicity drop down with ethnicities from the PRSKB database
 */
function getEthnicities() {
    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#ethnicitySelect').replaceWith("<select id='ethnicitySelect' multiple></select>");

    //call the API and populate the ethnicity dropdown/multiselct with the results
    $.ajax({
        type: "GET",
        url: "ethnicities",
        success: async function (data) {
            ethnicityList = data;
            var selector = document.getElementById("ethnicitySelect");
            for (i = 0; i < ethnicityList.length; i++) {
                var opt = document.createElement('option')
                opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(ethnicityList[i])))
                opt.value = ethnicityList[i]
                opt.selected = "selected"
                selector.appendChild(opt);
            }
            // adds an unspecified option to account for studies with a blank ethnicity column
            var opt = document.createElement('option')
            opt.appendChild(document.createTextNode("Unspecified"))
            opt.value = "unspecified"
            opt.selected = "selected"
            selector.appendChild(opt);
            document.multiselect('#ethnicitySelect');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the ethnicities: ${XMLHttpRequest.responseText}`);
        }
    })
}

/**
 * Populates the studies drop down with studies from the PRSKB database using selected traits, types, and enthnicities as filters
 * @param {*} selectedTraits 
 * @param {*} selectedTypes 
 * @param {*} selectedEthnicities 
 */
function callGetStudiesAPI(selectedTraits, selectedTypes, selectedEthnicities) {
    var studySelector = document.getElementById("studySelect");

    $.ajax({
        type: "POST",
        url: "/get_studies",
        data: { studyTypes: selectedTypes, traits: selectedTraits, ethnicities: selectedEthnicities },
        success: async function (data) {
            //data ~ {traitName:[{study},{study},{study}], traitName:[{study},{study}],...}
            var studyLists = data;
            var traits = Object.keys(data);

            if (traits.length == 0) {
                alert(`No results were found using the specified filters. Try using different filters.`)
            }

            for (i = 0; i < traits.length; i++) {
                var trait = traits[i];
                for (j = 0; j < studyLists[trait].length; j++) {
                    var study = studyLists[trait][j];
                    createOpt = true
                    var hasOption = $(`#studySelect option[value='${study.studyID}']`);
                    if (hasOption.length > 0) {
                        for (k=0; k < hasOption.length; k++) {
                            data_trait = hasOption[k].getAttribute('data-trait')
                            if (data_trait == trait) {
                                createOpt = false
                            }
                        }
                    }
                    if (createOpt) {
                        var opt = document.createElement('option');
                        var displayString = formatHelper.formatForWebsite(trait + ' | ' + study.citation + ' | ' + study.studyID);
                        opt.appendChild(document.createTextNode(displayString));
                        opt.value = study.studyID;
                        opt.setAttribute('data-trait', trait);
                        studySelector.appendChild(opt);
                    }
                }
            }

            // order the studies (trait -> citation -> studyID)
            $("#studySelect").html($("#studySelect option").sort(function (a, b) {
                return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
            }))
            document.multiselect('#studySelect');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies: ${XMLHttpRequest.responseText}`);
        }
    })
}

/**
 * Gets the selected selected traits, types, and enthnicities, then passes them to the callGetStudiesAPI function to populate the studies drop down
 */
function getStudies() {
    //get the users selected traits, ethnicities, and studty types as arrays of values
    var traitNodes = document.querySelectorAll('#traitSelect :checked');
    var selectedTraits = [...traitNodes].map(option => option.value);
    var ethnicityNodes = document.querySelectorAll('#ethnicitySelect :checked');
    var selectedEthnicities = [...ethnicityNodes].map(option => option.value);
    var typeNodes = document.querySelectorAll('#studyTypeSelect :checked');
    var selectedTypes = [...typeNodes].map(option => option.value);

    if (selectedTraits.length == 0) {
        console.log("NO TRAIT SELECTED")
        alert(`No traits selected. You must select at least one trait in order to filter studies.`);
        return;
    }

    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#studySelect').replaceWith("<select id='studySelect' multiple></select>")    

    //call the API and populate the study dropdown/multiselect with the results
    callGetStudiesAPI(selectedTraits, selectedTypes, selectedEthnicities)
}


/**
 * called in calculatePolyScore function, 
 * queries the server for associations with the given studyIDs, pValue, and reference genome
 * @param {*} studyList 
 * @param {*} refGen 
 * @param {*} sex 
 * @returns 
 */
function getSelectStudyAssociations(studyList, refGen, sex) {

    return Promise.resolve($.ajax({
        type: "POST",
        url: "/get_associations",
        data: { studyIDObjs: studyList, refGen: refGen, isVCF: true, sex: sex },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            var errMsg = `There was an error retrieving required associations: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(errMsg)
            alert(errMsg);
        }
    }));
}

/**
 *  changes the Calculate page based on the GWAS radio button selected
 * */ 
function changeGWASType() {
    var gwasType = document.querySelector('input[name="gwas_type"]:checked').value;

    if (gwasType === "Database") {
        document.getElementById("gwasDatabase").style.display = "initial";
        document.getElementById("gwasUpload").style.display = "none";
    }
    else {
        document.getElementById("gwasDatabase").style.display = "none";
        document.getElementById("gwasUpload").style.display = "initial";
    }
}

//called in calculatePolyscore function
//gets the clumping information using the positions from the associations object
var getClumpsFromPositions = async (associationsObj, refGen, superPop) => {
    positions = []

    for (key in associationsObj) {
        if (key.includes(":")) {
            positions.push(key)
        }
    }

    posMap = {}

    for (i=0; i < positions.length; i++) {
        if (positions[i].includes(":")) {
            position = positions[i]
            chromPos = position.split(":")
            if (!(chromPos[0] in posMap)) {
                posMap[chromPos[0]] = []
            }
            posMap[chromPos[0]].push(position)
        }
    }

    returnedResults = {}

    if (positions.length > 0) {
        for (chrom in posMap) {
            returnedResults = Object.assign(await callClumpsEndpoint(superPop, refGen, posMap[chrom]), returnedResults)
        }
    }

    return returnedResults
}

/**
 * Returns clumping information based on the given super population, reference genome, and association positions
 * @param {*} superPop 
 * @param {*} refGen 
 * @param {*} positions 
 * @returns 
 */
function callClumpsEndpoint(superPop, refGen, positions) {
    return Promise.resolve($.ajax({
        type: "POST",
        url: "/ld_clumping_by_pos",
        data: { superPop: superPop, refGen: refGen, positions: positions },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            var errMsg = `There was an error retrieving required associations: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(errMsg)
            alert(errMsg);
        }
    }));
}

//called when the user clicks the "Calcuate Risk Scores" button on the calculation page
//TODO comment
var calculatePolyScore = async () => {
    // get the values from the user's inputs/selections
    var vcfFile = document.getElementById("files").files[0];
    var refGenElement = document.getElementById("refGenome");
    var refGen = refGenElement.options[refGenElement.selectedIndex].value
    var superPopElement = document.getElementById("superPopSelect");
    var superPop = superPopElement.options[superPopElement.selectedIndex].value
    var sexElement = document.getElementById("sex");
    var sex = sexElement.options[sexElement.selectedIndex].value
    var pValueScalar = document.getElementById('pValScalarIn').value;
    var pValMagnitute = -1 * document.getElementById('pValMagIn').value;
    var pValue = pValueScalar.concat("e".concat(pValMagnitute));

    //if the user doesn't specify a refgen, super pop, or default sex, prompt them to do so
    if (refGen == "default") {
        updateResultBoxAndStoredValue('Please select the reference genome corresponding to your file (step 2).');
        document.getElementById('resultsDisplay').style.display = 'block';
        return;
    }
    if (superPop == "default") {
        updateResultBoxAndStoredValue('Please select the super population corresponding to your file (step 2).');
        document.getElementById('resultsDisplay').style.display = 'block';
        return;
    }
    if (sex == "default") {
        sex = "f"
        if (!confirm("Female is the default for default sex. Since no default sex was selected, we will use female as the default sex. Continue?")) {
            return
        }
    }

    var gwasType = document.querySelector('input[name="gwas_type"]:checked').value;

    // if the user is uploading GWAS data, grab it and format it correctly
    if (gwasType == "Upload") {
        var gwasDataFile = document.getElementById("gwasFile").files[0];
        var gwasRefGenElement = document.getElementById("gwasRefGenome");
        var gwasRefGen = gwasRefGenElement.options[gwasRefGenElement.selectedIndex].value

        document.getElementById('resultsDisplay').style.display = 'block';
        updateResultBoxAndStoredValue("Calculating. Please wait...")

        associationData = await getGWASUploadData(gwasDataFile, gwasRefGen, refGen)

    }
    else {
        var studyNodes = document.querySelectorAll('#studySelect :checked');
        var studies = [...studyNodes].map(option => [option.value, option.dataset.trait]);

        if (studies.length === 0) {
            updateResultBoxAndStoredValue('Please specify at least one trait and study from the dropdowns above (steps 3-5).');
            document.getElementById('resultsDisplay').style.display = 'block';
            return;
        }
    
        document.getElementById('resultsDisplay').style.display = 'block';
        updateResultBoxAndStoredValue("Calculating. Please wait...")
    
        //convert the studies into a list of studyIDs/traits
        var studyList = [];
        for (i = 0; i < studies.length; i++) {
            studyList.push({
                trait: studies[i][1],
                studyID: studies[i][0]
            });
        }
    
        //send a get request to the server with the specified traits and studies
        associationData = await getSelectStudyAssociations(studyList, refGen, sex);
    }

    clumpsData = await getClumpsFromPositions(associationData['associations'], refGen, superPop);

    //if in text input mode
    if (document.getElementById('textInputButton').checked) {
        //TODO: is it possible to refactor the next ~20 lines of code into its own function for increased readability?
        var textArea = document.getElementById('input');

        //if text input is empty, return error
        if (!textArea.value) {
            updateResultBoxAndStoredValue("Please input RS IDs by hand according to the procedures above or import a VCF file using the \"File Upload\" and then the \"Choose File\" buttons above (step 1).");
            return;
        }

        var arrayOfInputtedSnps = textArea.value.split(/[\s|\n|]+/);
        var snpObjs = new Map();
        for (var i = 0; i < arrayOfInputtedSnps.length; ++i) {
            var snpObj;
            snp = arrayOfInputtedSnps[i]
            //snp entry is split into two elements, the snpid (0) and the alleles (1)
            snpArray = snp.split(':');
            //if the snpid is invalid, return error
            if (!snpArray[0].toLowerCase().startsWith("rs") || isNaN(snpArray[0].substring(2, snpArray[0].length))) {
                updateResultBoxAndStoredValue("Invalid SNP id \"" + snpArray[0] + "\". Each ID should start with \"rs\" followed by a string of numbers.");
                return;
            }
            if (snpArray.length > 2) {
                updateResultBoxAndStoredValue("Invalid SNP \"" + snp + "\". Each SNP entry should only contain one colon.");
                return;
            }
            else if (snpArray.length == 2) {
                //get the alleles in list form
                var alleleArray = snpArray[1].split(",");
                //if more than 2 alleles, return error
                if (alleleArray.length > 2) {
                    
                    updateResultBoxAndStoredValue("Too many alleles for \"" + snp + "\". Each SNP should have a maximum of two alleles.");
                    return;
                }
                for (var j = 0; j < alleleArray.length; ++j) {
                    //if any allele is not  A, T, G, or C, return error
                    if (["A", "T", "G", "C"].indexOf(alleleArray[j].toUpperCase()) < 0) {
                        updateResultBoxAndStoredValue("Allele \"" + alleleArray[j] + "\" is invalid. Must be A, T, G, or C.");
                        return;
                    }
                }
            }
            snpObj = {
                pos: snpArray[0],
                alleleArray: alleleArray
            }
            snpObjs.set(snpArray[0], snpObj);
        }
        handleCalculateScore(snpObjs, associationData, clumpsData, pValue, false);
    }
    else {
        //if text input is empty, return error
        if (typeof vcfFile === "undefined") {
            updateResultBoxAndStoredValue("Please import a VCF file using the \"Choose File\" button above or input RS IDs by hand using the \"Text input\" button above (step 1).");
            return;
        }
        else {
            var extension = vcfFile.name.split(".").pop();
            if (extension.toLowerCase() != "vcf") {
                //if here, the user uploded a file with an invalid format
                updateResultBoxAndStoredValue("Invalid file format. Check that your file is an unzipped vcf file and try again.\n" +
                                                "Please note that the web version of PRSKB does not support zipped files,\n"+ 
                                                "but that the command line interface does. It is available for download\n" +
                                                "above under the \"Download\" tab or at https://prs.byu.edu/cli_download.html");
                                                
                return;
            }
            handleCalculateScore(vcfFile, associationData, clumpsData, pValue, true);
        }
    }
}

/**
 * 
 * @param {*} gwasUploadFile the uploaded tab separated GWAS data file
 * @param {*} gwasRefGen the reference genome of the GWAS upload data
 * @param {*} refGen the reference genome of the samples
 * @returns the associations data object used in calculating polygenic risk scores
 */
async function getGWASUploadData(gwasUploadFile, gwasRefGen, refGen) {
    var fileContents = await readFile(gwasUploadFile);
    fileLines = fileContents.split("\n")

    associationsDict = {}
    chromSnpDict = {}
    studyIDsToMetaData = {}

    sii = -1 //studyID index
    ti = -1 //trait index
    si = -1 //snp index
    ci = -1 //chromosome index
    pi = -1 //position index
    rai = -1 //risk allele index
    ori = -1 //odds ratio index
    pvi = -1 //p value index
    cti = -1 // optional citation index
    rti = -1 // optional reported trait index

    for (i=0; i<fileLines.length; i++) {
        if (i==0) {
            cols = fileLines[i].toLowerCase().replace(/\r$/, '').split('\t')
            sii = cols.indexOf("study id")
            ti = cols.indexOf("trait")
            si = cols.indexOf("rsid")
            ci = cols.indexOf("chromosome")
            pi = cols.indexOf("position")
            rai = cols.indexOf("risk allele")
            ori = cols.indexOf("odds ratio")
            pvi = cols.indexOf("p-value")
            cti = cols.indexOf("citation")
            rti = cols.indexOf("reported trait")

            if (sii == -1 || ti == -1 || si == -1 || ci == -1 || pi == -1 || rai == -1 || ori == -1 || pvi == -1) {
                console.log(sii, ti, si, ci, pi, rai, ori, pvi)
                alert("The format of your GWAS upload is incorrect. Please fix it and try again.")
                return
            }
        }
        else {
            cols = fileLines[i].replace(/\r$/, '').split('\t')
            // create the chrom:pos to snp dict
            // if the chrom:pos not in the chromSnpDict
            if (!(`${cols[ci]}:${cols[pi]}` in chromSnpDict)) {
                // add the chrom:pos with the snp rsID
                chromSnpDict[`${cols[ci]}:${cols[pi]}`] = cols[si]
            }

            // create the snp to associations stuff dict
            // if snp not in associations dict
            if (!(cols[si] in associationsDict)) {
                associationsDict[cols[si]] = {
                    // pos: "chromosome:position"
                    pos: `${cols[ci]}:${cols[pi]}`,
                    traits: {}
                }
            }
            // if trait not in associationsDict[snp][traits]
            if (!(cols[ti] in associationsDict[cols[si]]["traits"])) {
                associationsDict[cols[si]]["traits"][cols[ti]] = {}
            }
            // if studyID not in associationsDict[snp]["traits"][trait]
            if (!(cols[sii] in associationsDict[cols[si]]["traits"][cols[ti]])) {
                associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]] = {
                    riskAllele: cols[rai],
                    pValue: parseFloat(cols[pvi]),
                    oddsRatio: parseFloat(cols[ori]),
                    sex: "NA"
                }
            }
            else {
                // if the pvalue for the current association is more significant than the one in the associations dict for this snp->trait->studyID
                // replace the association data
                if (parseFloat(cols[pvi]) < associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]]["pValue"]) {
                    associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]] = {
                        riskAllele: cols[rai],
                        pValue: parseFloat(cols[pvi]),
                        oddsRatio: parseFloat(cols[ori]),
                        sex: "NA"
                    }
                }
            }

            // create the metadata info dict
            // if the studyID is not in the studyIDsToMetaData
            if (!(cols[sii] in studyIDsToMetaData)) {
                studyIDsToMetaData[cols[sii]] = {
                    // if the citation index is not -1 (meaning the user had a citation column in the GWAS tsv), add the citation, otherwise, leave blank
                    citation: (cti != -1 ? cols[cti] : ""),
                    // if the reportedTrait index is not -1 (meaning the user had a reportedTrait column in the GWAS tsv), add the reportedTrait, otherwise, leave blank
                    reportedTrait: (rti != -1 ? cols[rti] : ""),
                    studyTypes: [],
                    traits: {},
                    ethnicity: []
                }
            }
            // if the trait is not in studyIDsToMetaData[studyID]["traits"]
            if (!(cols[ti] in studyIDsToMetaData[cols[sii]]["traits"])) {
                // add the trait
                studyIDsToMetaData[cols[sii]]["traits"][cols[ti]] = []
            }
        }
    }

    if (gwasRefGen != refGen) {
        snps = Object.keys(associationsDict)
        chromSnpDict = await getChromPosToSnps(refGen, snps)
    }

    associationData = Object.assign(associationsDict, chromSnpDict)
    returnDict = {
        associations: associationData,
        studyIDsToMetaData: studyIDsToMetaData
    }
    return returnDict
}

/**
 * 
 * @param {*} refGen the reference genome of the samples
 * @param {*} snps the rsids of the snps from gwas upload data
 * @returns an object of chrom:pos to snp to use in conversions in the associations data
 */
function getChromPosToSnps(refGen, snps) {
    return Promise.resolve($.ajax({
        type: "GET",
        url: "/snps_to_chrom_pos",
        data: { snps: snps, refGen: refGen },
        success: async function (data) {
            return data
        },
        error: function (XMLHttpRequest) {
            var errMsg = `There was an error retrieving required snps data: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(errMsg)
            alert(errMsg);
        }
    }));
}

/**
 * Resets resultJSON
 */
function resetOutput() { //todo maybe should add this to when the traits/studies/ect are changed?
    resultJSON = "";
    unusedTraitStudyArray = []
}

//TODO write comment
//TODO rename function
var getGreppedSnpsAndTotalInputVariants = async (snpsInput, associationData, isVCF) => {
    //Gets a map of pos/snp -> {snp, pos, oddsRatio, allele, study, trait}
    var associMap = associationData['associations']
    
    //remove SNPs that aren't relevant from the snpsInput object
    var greppedSNPs;
    var totalInputVariants = 0;
    if (isVCF) {
        try {
            //greps the vcf file, removing snps not in the database table object returned
            var vcfLines = await getFileLines(snpsInput);
            totalInputVariants = getNumDatalines(vcfLines);
            var reducedVCFLines = await getGreppedFileLines(vcfLines, associMap);

            //converts the vcf lines into an object that can be parsed
            greppedSNPs = vcf_parser.getVCFObj(reducedVCFLines);
            return [greppedSNPs, totalInputVariants]
        }
        catch (err) {
            updateResultBoxAndStoredValue(getErrorMessage(err));
            return;
        }
    }
    else {
        var greppedSNPsList = [];
        totalInputVariants = snpsInput.size;
        for (const key of snpsInput.keys()) {
            if (key in associMap) {
                greppedSNPsList.push(snpsInput.get(key));
            }
        }
        var greppedSNPs = new Map();
        greppedSNPs.set("TextInput", greppedSNPsList);
        return [greppedSNPs, totalInputVariants]
    }
}

/**
 * Calculates scores from the file input from the user
 * @param {*} snpsInput- the file or text input by the user (specifiying snps of interest)
 * @param {*} associationData- the associations from get_associations (specifying traits and studies for calculations)
 * @param {*} clumpsData - the clumping data needed to 
 * @param {*} pValue- the pvalue cutoff for scores
 * @param {*} isVCF - whether the user gave us a VCF file or SNP text
 * No return- prints the simplified scores result onto the webpage
 */
var handleCalculateScore = async (snpsInput, associationData, clumpsData, pValue, isVCF) => {
    var greppedSNPsAndtotalInputVariants = await getGreppedSnpsAndTotalInputVariants(snpsInput, associationData, isVCF)
    var greppedSNPs = greppedSNPsAndtotalInputVariants[0]
    var totalInputVariants = greppedSNPsAndtotalInputVariants[1]
    try {
        var result = await calculateScore(associationData, clumpsData, greppedSNPs, pValue, totalInputVariants);
        try {
            unusedTraitStudyCombo = result[1]
            result = JSON.parse(result[0])
        } catch (e) {
            //todo create an endpoint that we can send errors to and give a better error response for the user
            console.log("There was an error in calculating the results. Please try again.")
        }
        if (result == {}) {
            $('#response').html("None of the snps from the input file were found.");
        }
        else {
            //shortens the result for website desplay
            outputVal = getSimpleOutput(result)
            $('#response').html(outputVal);
        }
        //saves the full result on currently open session of the website for further modifications 
        resultJSON = result;
        unusedTraitStudyArray = unusedTraitStudyCombo;
        //go the the result output box
        $('#responseBox')[0].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        })
    }
    catch (err) {
        updateResultBoxAndStoredValue(getErrorMessage(err));
    }
}


/**
 * Calculates the polygenic risk scores for the greppedSamples data using the associationData object, with clumpsData and
 * pValue acting as filters. pValue and totalInputVariants are aditional statistics returned in the final json
 * The complete json returned is composed of two objects: the result including risk scores for all samples, studies, and
 * traits, and an unusedTraitStudyCombo object containing all trait-study combos that were not used in calculations
 * @param {*} associationData 
 * @param {*} clumpsData 
 * @param {*} greppedSamples 
 * @param {*} pValue 
 * @param {*} totalInputVariants 
 * @returns 
 */
var calculateScore = async (associationData, clumpsData, greppedSamples, pValue, totalInputVariants) => {
    var resultObj = {};
    var indexSnpObj = {};
    var resultJsons = {};
    var unusedTraitStudyCombo = new Set()

    if (greppedSamples == undefined) {
        throw "The input was undefined when calculating the score. Please check your input file or text or reload the page and try again."
    }
    else {
        //add information to results
        resultJsons = { 
            pValueCutoff: pValue, 
            totalVariants: totalInputVariants,
            studyResults: {}
        }
        //if the input data has at least one individual
        if (greppedSamples.size > 0) {
            //for each individual, get a map containing all studies to the oddsRatios, snps and pos associated to each study and individual
            //then convert this map into the right format for results
            //for each individual and their snp info in the vcf object
            for (const [individualName, individualSNPObjs] of greppedSamples.entries()) {
                for (studyID in associationData['studyIDsToMetaData']) {
                    for (trait in associationData['studyIDsToMetaData'][studyID]['traits']) {
                        if ('traitsWithDuplicateSnps' in associationData['studyIDsToMetaData'][studyID] && associationData['studyIDsToMetaData'][studyID]['traitsWithDuplicateSnps'].includes(trait)) {
                            printStudyID = studyID.concat('†')
                        }
                        else {
                            printStudyID = studyID
                        }

                        if (!(printStudyID in resultObj)) {
                            resultObj[printStudyID] = {}
                        }
                        if (!(trait in resultObj[printStudyID])) {
                            resultObj[printStudyID][trait] = {}
                        }
                        if (!(individualName in resultObj[printStudyID][trait])) {
                            resultObj[printStudyID][trait][individualName] = {
                                snps: {},
                                variantsWithUnmatchedAlleles: [],
                                variantsInHighLD: []
                            }
                        }
                        if (!([trait, studyID, individualName].join("|") in indexSnpObj)) {
                            indexSnpObj[[trait, studyID, individualName].join("|")] = {}
                        }
                    }
                }

                //for each snp of the individual in the vcf
                individualSNPObjs.forEach(function (individualSNPObj) {
                    //using the individualSNPObj.pos as key, gets all corresponding databasePosObjs from the database through
                    //usefulPos. Each databasePosObj contains: snp, pos, oddsRatio, allele, study, traits, reportedTraits, and studyID
                    //databasePosObjs will normally only be size 1, but when mutiple studies have the same allele, it will be longer
                    key = individualSNPObj.snp
                    alleles = individualSNPObj.alleleArray

                    if (!key.includes("rs")) {
                        if (individualSNPObj.pos in associationData['associations']){
                            key = associationData['associations'][individualSNPObj.pos]
                        }
                    }

                    if (key in associationData['associations'] && alleles != []) {
                        for (trait in associationData['associations'][key]['traits']) {
                            for (studyID in associationData['associations'][key]['traits'][trait]) {
                                printStudyID = studyID
                                traitStudySamp = [trait, studyID, individualName].join("|")
                                associationObj = associationData['associations'][key]['traits'][trait][studyID]
                                if ('traitsWithDuplicateSnps' in associationData['studyIDsToMetaData'][studyID]) {
                                    if (associationData['studyIDsToMetaData'][studyID]['traitsWithDuplicateSnps'].includes(trait)) {
                                        printStudyID = studyID.concat('†')
                                    }
                                }

                                if (associationObj.pValue <= pValue) {
                                    numAllelesMatch = 0
                                    for (i=0; i < alleles.length; i++) {
                                        allele = alleles[i]
                                        if (allele == associationObj.riskAllele){
                                            numAllelesMatch++;
                                        }
                                        else {
                                            resultObj[printStudyID][trait][individualName]['variantsWithUnmatchedAlleles'].push(key)
                                        }
                                    }
                                    if (numAllelesMatch > 0) {
                                        if (clumpsData !== undefined && key in clumpsData) {
                                            clumpNum = clumpsData[key]['clumpNum']
                                            if (clumpNum in indexSnpObj[traitStudySamp]) {
                                                indexClumpSnp = indexSnpObj[traitStudySamp][clumpNum]
                                                indexPvalue = associationData['associations'][indexClumpSnp]['traits'][trait][studyID]['pValue']
                                                if (associationObj.pValue < indexPvalue) {
                                                    delete resultObj[printStudyID][trait][individualName]['snps'][indexClumpSnp] //TODO test that this worked
                                                    resultObj[printStudyID][trait][individualName]['variantsInHighLD'].push(indexClumpSnp)
                                                    resultObj[printStudyID][trait][individualName]['snps'][key] = numAllelesMatch
                                                    indexSnpObj[traitStudySamp][clumpNum] = key
                                                }
                                                else {
                                                    // add the current snp to neutral snps
                                                    resultObj[printStudyID][trait][individualName]['variantsInHighLD'].push(key)
                                                }
                                            }
                                            else {
                                                // add the clumpNum/key to the indexSnpObj
                                                indexSnpObj[traitStudySamp][clumpNum] = key
                                                resultObj[printStudyID][trait][individualName]['snps'][key] = numAllelesMatch
                                            }
                                        } else {
                                            // just add the snp to calculations
                                            resultObj[printStudyID][trait][individualName]['snps'][key] = numAllelesMatch
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
            }

            for (studyID in resultObj) {
                if (studyID.includes('†')) {
                    studyID_og = studyID.slice(0, -1)
                }
                else {
                    studyID_og = studyID
                }
                tmpStudyObj = {
                    citation: associationData['studyIDsToMetaData'][studyID_og]['citation'],
                    reportedTrait: associationData['studyIDsToMetaData'][studyID_og]['reportedTrait'],
                    traits: {}
                }
                for (trait in resultObj[studyID]) {
                    tmpTraitObj = {}
                    atLeastOneGoodSamp = false
                    for (sample in resultObj[studyID][trait]) {
                        scoreAndSnps = calculateCombinedORandFormatSnps(resultObj[studyID][trait][sample], trait, studyID_og, associationData)
                        tmpSampleObj = {
                            oddsRatio: scoreAndSnps[0],
                            protectiveVariants: scoreAndSnps[2],
                            riskVariants: scoreAndSnps[1],
                            unmatchedVariants: scoreAndSnps[3],
                            clumpedVariants: scoreAndSnps[4]
                        }
                        tmpTraitObj[this.trim(sample)] = tmpSampleObj
                        if (tmpSampleObj.oddsRatio != "NF" || tmpSampleObj.unmatchedVariants.length != 0) {
                            atLeastOneGoodSamp = true
                        }
                    }
                    if (atLeastOneGoodSamp) {
                        tmpStudyObj['traits'][trait] = tmpTraitObj
                    }
                    else {
                        tmpStudyObj['traits'][trait] = {}
                        unusedTraitStudyCombo.add([trait, studyID_og])
                        delete tmpStudyObj['traits'][trait]
                    }
                }
                if (atLeastOneGoodSamp) {
                    resultJsons['studyResults'][studyID] = tmpStudyObj
                }
            }
        }
        //if the input data doesn't have an individual in it (we can assume this is a text input query with no matching SNPs)
        //TODO fill this out
        else {

        }
        //convert the result JSON list to a string, the unusedTraitStudyCombo to array and return
        return [JSON.stringify(resultJsons), Array.from(unusedTraitStudyCombo)];
    }
}

/**
 * Calculates the combined odds ratio for the SNPs in the sampleObj (this process is the crux of the web PRSKB
 * because it is the formula for calculating the PRS)
 * Also sorts the SNPs from the sampleObj into 4 sets based on their contribution type to the combined OR
 * @param {*} sampleObj 
 * @param {*} trait 
 * @param {*} studyID 
 * @param {*} associationData 
 * @returns list containing combinied OR and 4 sets of SNPs grouped by SNP type
 */
function calculateCombinedORandFormatSnps(sampleObj, trait, studyID, associationData) {
    var combinedOR = 0;
    var protective = new Set()
    var risk = new Set()
    var unmatched = new Set(sampleObj.variantsWithUnmatchedAlleles)
    var clumped = new Set(sampleObj.variantsInHighLD)

    //calculate the odds ratio and determine which alleles are protective, risk, and neutral
    for (snp in sampleObj['snps']) {
        snpDosage = sampleObj['snps'][snp]
        snpOR = associationData['associations'][snp]['traits'][trait][studyID]['oddsRatio']
        combinedOR += (Math.log(snpOR) * snpDosage)
        if (snpOR > 1) {
            risk.add(snp)
        }
        else if (snpOR < 1) {
            protective.add(snp)
        }
    }

    if (combinedOR === 0) {
        combinedOR = "NF"
    }
    else {
        combinedOR = Math.exp(combinedOR);
    }

    return [combinedOR, Array.from(risk), Array.from(protective), Array.from(unmatched), Array.from(clumped)]
}

/**
 * Trims the whitespace from both the beginning and the end of the string and returns it.
 * @param {*} str 
 */
var trim = function (str) {
    return str.replace(/^\s+|\s+$/gm, '');
}

/**
 * Returns a string beginning with a generic error message followed by the error's message and stack, if they are available
 * @param {*} err 
 * @returns 
 */
function getErrorMessage(err) { //TODO we are going to want to NOT give this information to the user in the final product. What we can and should do is create an endpoint to send errors to that can be saved for us to look over later
    var response = 'There was an error computing the risk score:'
    if (err != undefined) {
        response += '\n' + err;
    }
    if (err.stack != undefined) {
        response += '\n' + err.stack;
    }
    return response;
}

/**
 * Returns a simplified output using the given json. The json is truncated and converted to the correct format.
 * Then, if a truncation occured, "Results preview:" is appended to the beginning and "..." is appended to the end.
 * @param {*} resultJsn
 */
function getSimpleOutput(resultJsn) {
    var fullResultNum = Object.keys(resultJsn['studyResults']).length
    var simpleJson = simplifyResultJson(resultJsn);
    var simpleResultNum = Object.keys(simpleJson['studyResults']).length
    var simpleOutput = getResultOutput(simpleJson)
    if (fullResultNum != simpleResultNum) {
        simpleOutput = "Results preview:\n" + simpleOutput + "\n...";
    }
    return simpleOutput;
}

/**
 * Truncates the result to include the results for the first two individuals, including calculation info ("resultJsonObj[0]").
 * @param {*} resultJsonObj the large resultJson to be truncated
 */
function simplifyResultJson(resultJsonObj) {
    //if the resultJson is already truncated, return it
    if (resultJsonObj['studyResults'].length <= 2) {
        return resultJsonObj;
    }
    //create a new obj, add the first 2 studyIDs to the studyResults
    else {
        var simpleResultObj = {
            "pValueCutoff": resultJsonObj['pValueCutoff'],
            "totalVariants": resultJsonObj['totalVariants'],
            "studyResults": {}
        };

        i=0
        for (studyID in resultJsonObj['studyResults']) {
            i++
            simpleResultObj['studyResults'][studyID] = resultJsonObj['studyResults'][studyID];
            if (i >= 2) {
                break
            }
        }
        return simpleResultObj;
    }
}

/**
 * returns a list of lines from a file
 * @param {} vcfFile 
 */
async function getFileLines(vcfFile) {
    var fileContents = await readFile(vcfFile);
    return fileContents.split("\n");
}

/**
 * Returns the number of lines from fileLines that are data lines.
 * @param {} fileLines 
 */
function getNumDatalines(fileLines) {
    var numSNPLines = 0;
    for (var i = 0; i < fileLines.length; ++i) {
        if (!fileLines[i].startsWith("#") && fileLines[i] != "") {
            numSNPLines += 1;
        }
    }
    return numSNPLines;
}

/**
 * Removes all lines that don't have positions found in the associationData. 
 * Returns a list of lines that are valid, including the metadata and header lines
 * @param {} fileLines 
 * @param {*} associMap 
 */
async function getGreppedFileLines(fileLines, associMap) {
    return jQuery.grep(fileLines, function (line) {
        return line[0] === '#' || getSnpFromLine(line) in associMap || getPosFromLine(line) in associMap;
    });
}

/**
 * Gets chrom:pos from the line
 * @param {} line 
 */
function getPosFromLine(line) {
    var secondTab = line.indexOf('\t', line.indexOf('\t') + 1);
    return line.substr(0, secondTab).replace('\t', ':');
}

/**
 * Gets the snp from the line
 * @param {} line 
 */
function getSnpFromLine(line) {
    const regex = /rs[0-9]+/;
    match = line.match(regex)
    return match != null ? match[0] : null
}

/**
 * Format the jsonObject into a TSV format. The header and subsequent columns are decided based on the isCondensed boolean
 * @param {*} jsonObject 
 * @param {*} isCondensed 
 * @returns resultsString containing the finalized TSV file in string form
 */
function formatTSV(jsonObject, isCondensed) {
    //Look for a csv writer npm module
    //TODO: account for if the samples are not in the same order everytime
    sampleKeys = []

    if (isCondensed) {
        headerInit = ['Study ID', 'Reported Trait', 'Trait', 'Citation']
    }
    else {
        headerInit = ['Sample', 'Study ID', 'Reported Trait', 'Trait', 'Citation', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants without Risk Allele', 'Variants in High LD']
    }

    resultsString = ''

    studyIDKeys = Object.keys(jsonObject['studyResults'])

    first = true
    for (var i = 0; i < studyIDKeys.length; i++) {
        studyID = studyIDKeys[i]
        traitKeys = Object.keys(jsonObject['studyResults'][studyID]['traits'])
        for (var j = 0; j < traitKeys.length; j++) {
            trait = traitKeys[j]
            lineInfo = [studyID, jsonObject['studyResults'][studyID]['reportedTrait'], trait, jsonObject['studyResults'][studyID]['citation']]

            if (first) {
                first = false
                sampleKeys = Object.keys(jsonObject['studyResults'][studyID]['traits'][trait])
                if (isCondensed) {
                    resultsString = headerInit.join("\t") + "\t" + sampleKeys.join("\t")
                }
                else {
                    resultsString = headerInit.join("\t")
                }
            }

            for (var k = 0; k < sampleKeys.length; k++) {
                sample = sampleKeys[k]
                oddsRatio = jsonObject['studyResults'][studyID]['traits'][trait][sample]['oddsRatio']
                if (isCondensed) {
                    lineInfo.push(oddsRatio)
                }
                else {
                    protectiveSnps = jsonObject['studyResults'][studyID]['traits'][trait][sample]['protectiveVariants']
                    riskSnps = jsonObject['studyResults'][studyID]['traits'][trait][sample]['riskVariants']
                    // unmatchedSnps are variants present in an individual, but with an allele other than the risk allele
                    unmatchedSnps = jsonObject['studyResults'][studyID]['traits'][trait][sample]['unmatchedVariants']
                    // clumpedSnps are variants in LD with a variant with a more significant p-value, so their odds ratio isn't included in the prs calculation
                    clumpedSnps = jsonObject['studyResults'][studyID]['traits'][trait][sample]['clumpedVariants']

                    // set the arrays to "." if they are empty, otherwise join them on bar ("|")
                    protectiveSnps = (protectiveSnps.length == 0) ? "." : protectiveSnps.join("|")
                    riskSnps = (riskSnps.length == 0) ? "." : riskSnps.join("|")
                    unmatchedSnps = (unmatchedSnps.length == 0) ? "." : unmatchedSnps.join("|")
                    clumpedSnps = (clumpedSnps.length == 0) ? "." : clumpedSnps.join("|")

                    lineResult = `${sample}\t${lineInfo.join('\t')}\t${oddsRatio}\t${protectiveSnps}\t${riskSnps}\t${unmatchedSnps}\t${clumpedSnps}`
                    resultsString = resultsString.concat("\n", lineResult)
                }
            }
            if (isCondensed) {
                resultsString = resultsString + "\n" + lineInfo.join("\t")
            }
        }
    }

    return resultsString;
}

/**
 * Updates the output on the web page based on the format chosen (JSON or TSV)
 */
function changeFormat() {
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;

    if (format == 'json') {
        $('#fileFormat option[value=full]').prop('selected', true);
        document.getElementById("fileFormat").disabled = true;
    }
    else {
        document.getElementById("fileFormat").disabled = false;
    }

    if (!resultJSON) {
        return;
    }
    var outputVal = getSimpleOutput(resultJSON);
    $('#response').html(outputVal);
}

//TODO comment
function getResultOutput(jsonObject) {
    if (jsonObject == undefined || jsonObject == "") {
        return "";
    }
    else {
        var outputVal = "";
        var formatDropdown = document.getElementById("fileType");
        var format = formatDropdown.options[formatDropdown.selectedIndex].value;

        var fileFormatEle = document.getElementById('fileFormat');
        var isCondensed = fileFormatEle.options[fileFormatEle.selectedIndex].value == 'condensed' ? true : false

        if (format === "tsv")
            outputVal += formatTSV(jsonObject, isCondensed);
        else if (format === "json")
            outputVal += JSON.stringify(jsonObject);
        else
            outputVal += "Please select a valid format."
        return outputVal;
    }
}

//TODO comment
function downloadResults() {
    if (resultJSON == {} && unusedTraitStudyArray.length == 0) {
        $('#response').html("There are no files to download. Please try the calculator again");
        return
    }

    //TODO: update
    document.getElementById("download-bar").style.visibility = "visible";
    //var resultText = document.getElementById("response").value;
    var resultText = getResultOutput(resultJSON);
    var formatDropdown = document.getElementById("fileType");
    var format = formatDropdown.options[formatDropdown.selectedIndex].value;
    //TODO better name?
    var fileName = "polyscore_" + getRandomInt(100000000);
    var extension = "";
    if (format === "tsv") {
        extension = ".tsv";
    }
    else {
        extension = ".txt";
    }
    if (unusedTraitStudyArray.length != 0) {
        formattedUnusedTraitStudyArray = unusedTraitStudyArray.join("\n")
    }
    else {
        formattedUnusedTraitStudyArray = null
    }

    download([fileName, fileName + "_unusedTraitStudy"], extension, [resultText, formattedUnusedTraitStudyArray]);
}

/**
 * Gets a random positive integer up to, but not including max
 * @param {*} max 
 * @returns random number between 0 and max - 1
 */
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/**
 * This code was found here https://jsfiddle.net/ali_soltani/zsyn04qw/3/
 * Creates an invisible element on the page that contains the string to be downloaded.
 * Once the element is downloaded, it is removed. May have a size limit- not sure what it is yet.
 * @param {*} filename
 * @param {*} text
 */
function download(filenameArray, extension, textArray) {
    var zip = new JSZip();
    zip.file(filenameArray[0] + extension, textArray[0]);
    if (textArray[1] != null && textArray[1].length != 0) {
        zip.file(filenameArray[1] + ".txt", textArray[1]);
    }
    zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
            //TODO let the user know that they've downloaded the file while they are waiting
            /* compression level ranges from 1 (best speed) to 9 (best compression) */
            level: 5
        }
    })
        .then(function (content) {
            // see FileSaver.js
            saveAs(content, filenameArray[0] + ".zip");
            document.getElementById("download-bar").style.visibility = "hidden";
        });

    /*
    var element = document.createElement('a');

    var dataBlob = new Blob([text], { type: "text/plain" });
    var objUrl = URL.createObjectURL(dataBlob);

    element.href = objUrl;
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();

    document.body.removeChild(element);
    */
}

// Used for creating a new FileList in a round-about way- found at https://stackoverflow.com/questions/52078853/is-it-possible-to-update-filelist/52079109
//see exampleInput for usage
function fileListItem(a) {
    a = [].slice.call(Array.isArray(a) ? a : arguments)
    for (var c, b = c = a.length, d = !0; b-- && d;) d = a[b] instanceof File
    if (!d) throw new TypeError("expected argument to FileList is File or array of File objects")
    for (b = (new ClipboardEvent("")).clipboardData || new DataTransfer; c--;) b.items.add(a[c])
    return b.files
}

/**
 * Writes the contents of the sample.vcf to the file upload box and stores the file on the web page for later calculations
 */
function exampleInput() {
    document.getElementById('fileUploadButton').click();
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', "sample.vcf");
    var errorLoading = function(pe) {
        alert("Error loading the example file. Please try again")
    }
    xmlhttp.onload = function(pe) {
        if (xmlhttp.status == 200) {
            result = xmlhttp.responseText;
        }
        var parts = [
            new Blob([result], { type: 'text/plain' }),
            new Uint16Array([33])
        ];
    
        // Construct a file
        var file = new File(parts, 'example.vcf', {
            lastModified: new Date(0), // optional - default = now
            type: "overide/mimetype" // optional - default = ''
        });
        document.getElementById("files").files = new fileListItem(file);
        var textInput = document.getElementById('input');
        //print the file's contents into the input box
        textInput.value = (result);
        //print the file's contents into an invisible storage box
        document.getElementById('savedVCFInput').value = (result);
        textInput.setAttribute("wrap", "soft");
        //removes file information text if a file was uploaded previously
        document.getElementById('list').innerHTML = ""
    }
    xmlhttp.onabort = errorLoading
    xmlhttp.onerror = errorLoading
    xmlhttp.ontimeout = errorLoading
    xmlhttp.send();
}

//TODO comment
function exampleGWASInput() {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', "sampleGWAS.tsv");
    var errorLoading = function(pe) {
        alert("Error loading the example GWAS file. Please try again")
    }
    xmlhttp.onload = function(pe) {
        if (xmlhttp.status == 200) {
            result = xmlhttp.responseText;
        }
        var parts = [
            new Blob([result], { type: 'text/plain' }),
            new Uint16Array([33])
        ];
    
        // Construct a file
        var file = new File(parts, 'sampleGWAS.tsv', {
            lastModified: new Date(0), // optional - default = now
            type: "overide/mimetype" // optional - default = ''
        });
        document.getElementById("gwasFile").files = new fileListItem(file);
    }
    xmlhttp.onabort = errorLoading
    xmlhttp.onerror = errorLoading
    xmlhttp.ontimeout = errorLoading
    xmlhttp.send();
}

//code run when the 'Text input' button is pressed
function clickTextInput() {
    //if the text button isn't already pressed
    if (!textButtonSelected) {
        textButtonSelected = true
        var textInput = document.getElementById('input');
        //clear the input box text 
        textInput.value = null;
        //make the input text box writable
        textInput.removeAttribute('readonly');
        //make the choose file button invisible
        var browseButton = document.getElementById('file-form');
        browseButton.style.visibility = 'hidden';
        //if there was text in the text input before, writes it the the input box
        var previousText = document.getElementById('savedTextInput');
        if (previousText.value !== "") {
            document.getElementById('input').value = previousText.value;
        }
    }
}

//code run when the 'File upload' button is pressed
function clickFileUpload() {
    //if the VCf button isn't already pressed
    if (textButtonSelected) {
        textButtonSelected = false;
        //saves the contents of the text input box if it is not empty
        var textInput = document.getElementById('input');
        if (textInput.value !== "") {
            document.getElementById('savedTextInput').value = textInput.value;
        }
        //clears the input box text
        textInput.value = null;
        //make input box unwritable
        textInput.setAttribute('readonly', 'readonly');
        //makes the choose file button visible
        var browseButton = document.getElementById('file-form');
        browseButton.style.visibility = 'visible';
        //if there was text in the file upload input box before, writes it to the input box
        var previousFileText = document.getElementById('savedVCFInput');
        if (previousFileText.value !== "") {
            document.getElementById('input').value = previousFileText.value;
        }
    }

}

// when the user updates the pvalue scalar, update the display and reset the output
function changePValScalar() {
    $("#pvalScalar").html($("#pValScalarIn").val());
    resetOutput()
    updateResultBoxAndStoredValue("");
}

// when the user updates the pvalue magnitude, update the display and reset the output
function changePValMagnitude() {
    $("#pvalMagnigtude").html(-1 * $("#pValMagIn").val());
    resetOutput()
    updateResultBoxAndStoredValue("");
}
