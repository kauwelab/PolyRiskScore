var resultJSON = "";
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
    document.getElementById("orValueType").checked = true;
    document.getElementById("mafThresholdIn").value = 0.0;
    document.getElementById("superPopSelect").value = "European"
}

//updates the output box and resultJSON string with the new string
function updateResultBoxAndStoredValue(str) {
    $('#response').html(str);
    resultJSON = str
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
            msg = `There was an error loading the traits: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg);
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
            msg = `There was an error loading the ethnicities: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg);
        }
    })
}

/**
 * Populates the studies drop down with studies from the PRSKB database using selected traits, types, and enthnicities as filters
 * @param {*} selectedTraits 
 * @param {*} selectedTypes 
 * @param {*} selectedEthnicities 
 */
function callGetStudiesAPI(selectedTraits, selectedTypes, selectedEthnicities, sex, valueType) {
    return Promise.resolve($.ajax({
        type: "POST",
        url: "/get_studies",
        data: { studyTypes: selectedTypes, traits: selectedTraits, ethnicities: selectedEthnicities, sexes: sex, ogValueTypes: valueType },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            msg = `There was an error retrieving study data: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg)
        }
    }));
}


var getStudyData = async (selectedTraits, selectedTypes, selectedEthnicities, sex, valueType) => {
    var studySelector = document.getElementById("studySelect");
    if (sex == "both") {
        sex = undefined
    }
    else if (sex == "exclude") {
        sex = ["NA"]
    }
    else {
        sex = [sex]
    }

    if (valueType == "both") {
        valueType = undefined
    }

    //TODO add a screen overlay that tells the user we are loading the studies. 

    returnedResults = {}
    lenOfList = selectedTraits.length
    i = 0
    j = lenOfList > 1000 ? 1000 : lenOfList
    if (j >= 500) {
        alert("Due to the number of traits selected, it will take us a little time to load. Please be patient. \nDepending on the number of traits selected and your internet connection, it could take up to 5 min to load. ")
    }
    runLoop = true
    while (runLoop) {
        console.log(`Working on grabbing studies for traits ${i}-${j}`)
        if (j == lenOfList) {
            runLoop = false
        }
        returnedResults = Object.assign(await callGetStudiesAPI(selectedTraits.slice(i,j), selectedTypes, selectedEthnicities, sex, valueType), returnedResults)
        i = j
        j = lenOfList > 1000 + j ? 1000 + j : lenOfList
    }
    var traits = Object.keys(returnedResults);

    if (traits.length == 0) {
        msg = `No results were found using the specified filters. Try using different filters.`
        updateResultBoxAndStoredValue(msg)
        alert(msg)
    }

    for (i = 0; i < traits.length; i++) {
        var trait = traits[i];
        for (j = 0; j < returnedResults[trait].length; j++) {
            var study = returnedResults[trait][j];
            createOpt = true
            var hasOption = $(`#studySelect option[value='${study.studyID}']`);
            if (hasOption.length > 0) {
                for (k=0; k < hasOption.length; k++) {
                    data_trait = hasOption[k].getAttribute('data-trait')
                    data_pValueAnno = hasOption[k].getAttribute('data-pvalueannotation')
                    data_betaAnno = hasOption[k].getAttribute('data-betaannotation')
                    data_valType = hasOption[k].getAttribute('data-valtype')
                    if (data_trait == trait && data_pValueAnno == study.pValueAnnotation && data_betaAnno == study.betaAnnotation && data_valType == study.ogValueType) {
                        createOpt = false
                    }
                }
            }
            if (createOpt) {
                var opt = document.createElement('option');
                var displayString = formatHelper.formatForWebsite(trait + ' | ' + study.pValueAnnotation + ' | ' + study.betaAnnotation + ' | ' + study.citation + ' | ' + study.studyID);
                opt.appendChild(document.createTextNode(displayString));
                opt.value = study.studyID;
                opt.setAttribute('data-trait', trait);
                opt.setAttribute('data-pvalueannotation', study.pValueAnnotation);
                opt.setAttribute('data-betaannotation', study.betaAnnotation);
                opt.setAttribute('data-valtype', study.ogValueTypes)
                studySelector.appendChild(opt);
            }
        }
    }

    // order the studies (trait -> citation -> studyID)
    $("#studySelect").html($("#studySelect option").sort(function (a, b) {
        return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
    }))
    document.multiselect('#studySelect');



    return returnedResults
}
    

/**
 * Gets the selected selected traits, types, and enthnicities, then passes them to the callGetStudiesAPI function to populate the studies drop down
 */
var getStudies = async () => {
    //get the users selected traits, ethnicities, and studty types as arrays of values
    var traitNodes = document.querySelectorAll('#traitSelect :checked');
    var selectedTraits = [...traitNodes].map(option => option.value);
    var ethnicityNodes = document.querySelectorAll('#ethnicitySelect :checked');
    var selectedEthnicities = [...ethnicityNodes].map(option => option.value);
    var typeNodes = document.querySelectorAll('#studyTypeSelect :checked');
    var selectedTypes = [...typeNodes].map(option => option.value);
    var sexElement = document.getElementById("sex");
    var sex = sexElement.options[sexElement.selectedIndex].value;
    var valueTypeElement = document.getElementById("valueType");
    var valueType = valueTypeElement.options[valueTypeElement.selectedIndex].value;

    if (selectedTraits.length == 0) {
        console.log("NO TRAIT SELECTED")
        msg = `No traits selected. You must select at least one trait in order to filter studies.`
        updateResultBoxAndStoredValue(msg)
        alert(msg);
        return;
    }

    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#studySelect').replaceWith("<select id='studySelect' multiple></select>")    

    //call the API and populate the study dropdown/multiselect with the results'
    returnedStudyObjects = await getStudyData(selectedTraits, selectedTypes, selectedEthnicities, sex, valueType)
}


/**
 * Called in calculatePolyScore function, 
 * queries the server for associations with the given studyIDs, reference genome, and default sex
 * @param {*} studyList 
 * @param {*} refGen 
 * @param {*} sex 
 * @returns 
 */
function getSelectStudyAssociations(studyList, refGen, sex, valueType) {
    if (sex == "both") {
        sex = undefined
    }
    else if (sex == "exclude") {
        sex = ["NA"]
    }
    else {
        sex = [sex]
    }

    if (valueType == "both") {
        valueType = undefined
    }

    return Promise.resolve($.ajax({
        type: "POST",
        url: "/get_associations",
        data: { studyIDObjs: studyList, refGen: refGen, isVCF: true, sexes: sex, ogValueTypes: valueType },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            msg = `There was an error retrieving required associations: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg)
        }
    }));
}

/**
 * Gets the percentile data from the server
 * @param {*} studyList
 * @param {*} cohort 
 * @returns 
 */
function getPercentiles(studyList, cohort) {
    return Promise.resolve($.ajax({
        type: "POST",
        url: "/get_percentiles",
        data: { studyIDObjs: studyList, cohort:cohort },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            msg = `There was an error retrieving percentiles: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg)
        }
    }))
}

/**
 * Gets the MAF data from the server
 * @param {*} mafCohort 
 * @returns 
 */
var getMafData = async (associationsObj, mafCohort, refGen) => {
    posMap = {}

    for (key in associationsObj) {
        if (key.includes(":")) {
            chromPos = key.split(":")
            if (!(chromPos[0] in posMap)){
                posMap[chromPos[0]] = []
            }
            posMap[chromPos[0]].push(chromPos[1])
        }
    }

    returnedResults = {}

    chromosomes = Object.keys(posMap)
    if (chromosomes.length > 0) {
        for (chrom in posMap) {
            returnedResults = Object.assign(await callMAFAPI(mafCohort, chrom, posMap[chrom], refGen), returnedResults)
        }
    }

    return returnedResults
}

function callMAFAPI(mafCohort, chrom, pos, refGen){
    return Promise.resolve($.ajax({
        type: "POST",
        url: "/get_maf",
        data: { cohort: mafCohort, chrom: chrom, pos: pos, refGen: refGen },
        success: async function (data) {
            return data;
        },
        error: function (XMLHttpRequest) {
            msg = `There was an error retrieving required maf data: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg)
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

/**
 * changes the Calculate page based on the GWAS value type radio button selected
 */
 function changeGWASValueType() {
    var gwasType = document.querySelector('input[name="gwas_value_type"]:checked').value;

    if (gwasType === "or") {
        $('#ogValueTypeColumn').replaceWith('<span id="ogValueTypeColumn"><span title="Computed in the GWA study, a numerical value representing the odds that those in the case group carry the allele of interest over the odds that those in the control group carry the allele of interest.">Odds&nbsp;Ratio<sup>?</sup></span></span>')
        $('#optionalPValAnno').replaceWith('<span id="optionalPValAnno" title="Annotation for P-values. Note that when this is present, calculations are split by p-value annotation."> P-Value&nbsp;Annotation<sup>?</sup>,</span>')
        $('#optionalHeaderBeta').replaceWith('<span id="optionalHeaderBeta"></span>')

    }
    else {
        //todo update this description!!!!!
        $('#ogValueTypeColumn').replaceWith('<span id="ogValueTypeColumn"><span title="Computed in the GWA study, a numerical value representing the odds that those in the case group carry the allele of interest over the odds that those in the control group carry the allele of interest.">Beta&nbsp;Coefficient<sup>?</sup></span>, <span id="ogValueTypeColumn" title="The units of the beta coefficient">Beta&nbsp;Units<sup>?</sup></span></span>')
        $('#optionalPValAnno').replaceWith('<span id="optionalPValAnno" title="Annotation for P-values. Note that when this is present, calculations are split by p-value annotation and beta annotation."> P-Value&nbsp;Annotation<sup>?</sup>,</span>')
        $('#optionalHeaderBeta').replaceWith('<span id="optionalHeaderBeta" title="Annotation for the Beta Coefficients. Note that when this is present, calculations are split by p-value annotation and beta annotation.">Beta&nbsp;Annotation<sup>?</sup>,</span>')
    }
}

//called in calculatePolyscore function
//gets the clumping information using the positions from the associations object
//TODO will need to update this for the new way of clumping
var getClumpsFromPositions = async (associationsObj, refGen, superPop) => {
    posMap = {}

    for (key in associationsObj) {
        if (key.includes(":")) {
            chromPos = key.split(":")
            if (!(chromPos[0] in posMap)){
                posMap[chromPos[0]] = []
            }
            posMap[chromPos[0]].push(key)
        }
    }

    returnedResults = {}

    chromosomes = Object.keys(posMap)
    if (chromosomes.length > 0) {
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
            msg = `There was an error retrieving required associations: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg)
        }
    }));
}

function getPreferredPop(superPopList, superPop) {
    superPop = superPop.toLowerCase()
    superPopList = superPopList.map(superPopI => {
        return superPopI.toLowerCase()
    })
    if (superPopList.length == 1 && superPopList[0].toLowerCase() == 'na'){
        return superPop
    }
    else {
        filteredKeys = []
        superPopHeirarchy = {
            'european': ['european', 'american', 'south asian', 'east asian', 'african'],
            'american': ['american', 'european', 'south asian', 'east asian', 'african'],
            'south asian': ['south asian', 'east asian', 'american', 'european', 'african'],
            'east asian': ['east asian', 'south asian', 'american', 'european', 'african'],
            'african': ['african', 'american', 'south asian', 'european', 'east asian']
        }
        fixKeys = {
            'european': 'EUR',
            'american': 'AMR',
            'south asian': 'SAS',
            'east asian': 'EAS',
            'african': 'AFR'
        }
        keys = superPopHeirarchy[superPop]
        for (i=0; i < keys.length; i++) {
            if (superPopList.includes(keys[i])) {
                filteredKeys.push(fixKeys[keys[i]])
            }
        }
        
        return filteredKeys[0]
    }
}

/**
 * Called when the user clicks the "Calcuate Risk Scores" button on the calculation page
 * Collects the information the user has specified on the web page and passes it to the handleCalculateScore function
 * to complete calculations 
 */
var calculatePolyScore = async () => {
    // get the values from the user's inputs/selections
    var vcfFile = document.getElementById("files").files[0];
    var refGenElement = document.getElementById("refGenome");
    var refGen = refGenElement.options[refGenElement.selectedIndex].value
    var superPopElement = document.getElementById("superPopSelect");
    var superPop = superPopElement.options[superPopElement.selectedIndex].value
    var pValueScalar = document.getElementById('pValScalarIn').value;
    var pValMagnitute = -1 * document.getElementById('pValMagIn').value;
    var pValue = pValueScalar.concat("e".concat(pValMagnitute));
    var mafElement = document.getElementById("mafCohort")
    var mafCohort = mafElement.options[mafElement.selectedIndex].value;
    var mafThreshold = document.getElementById("mafThresholdIn").value;
    var gwasType = document.querySelector('input[name="gwas_type"]:checked').value;
    var clumpingType = document.querySelector('input[name="ld_radio"]:checked').value;

    //if the user doesn't specify a refgen prompt them to do so
    if (refGen == "default" && !(document.getElementById('textInputButton').checked)) {
        msg = "Please select the reference genome corresponding to your file (step 2 of Sample(s) section)."
        updateResultBoxAndStoredValue(msg)
        alert(msg)
        return;
    }

    // if the user is uploading GWAS data, grab it and format it correctly
    if (gwasType == "Upload") {
        var gwasDataFile = document.getElementById("gwasFile").files[0];
        var gwasRefGenElement = document.getElementById("gwasRefGenome");
        var gwasRefGen = gwasRefGenElement.options[gwasRefGenElement.selectedIndex].value
        var gwasValueType = document.querySelector('input[name="gwas_value_type"]:checked').value;

        if (gwasRefGen == "default") {
            msg = 'Please select the reference genome corresponding to your GWAS file (GWAS Summary Statistics section).'
            updateResultBoxAndStoredValue(msg)
            alert(msg)
            return;
        }

        document.getElementById('resultsDisplay').style.display = 'block';
        updateResultBoxAndStoredValue("Calculating. Please wait...")

        associationData = await getGWASUploadData(gwasDataFile, gwasRefGen, refGen, gwasValueType)
    }
    else {
        var sexElement = document.getElementById("sex");
        var sex = sexElement.options[sexElement.selectedIndex].value
        var valueTypeElement = document.getElementById("valueType");
        var valueType = valueTypeElement.options[valueTypeElement.selectedIndex].value;
        var studyNodes = document.querySelectorAll('#studySelect :checked');
        var studies = [...studyNodes].map(option => [option.value, option.dataset.trait, option.dataset.pvalueannotation, option.dataset.betaannotation, option.dataset.valtype]);

        if (studies.length === 0) {
            msg = 'Please specify at least one trait and study from the dropdowns above (GWAS Summary Statistics section).'
            updateResultBoxAndStoredValue(msg)
            alert(msg)
            return;
        } else if (studies.length > 10) {
            alert('Due to the number of studies selected, this could take a long time. We suggest downloading our command-line interface tool and using it to run calculations. (see the Download page)')
        }
    
        document.getElementById('resultsDisplay').style.display = 'block';
        updateResultBoxAndStoredValue("Calculating. Please wait...")
    
        //convert the studies into a list of studyIDs/traits/pValueAnnotation
        var studyList = [];
        for (i = 0; i < studies.length; i++) {
            studyList.push({
                trait: studies[i][1],
                studyID: studies[i][0],
                pValueAnnotation: studies[i][2],
                betaAnnotation: studies[i][3],
                ogValueType: studies[i][4]
            });
        }
        //send a get request to the server with the specified traits and studies
        associationData = await getSelectStudyAssociations(studyList, refGen, sex, valueType);
    }

    allSuperPops = []
    for (studyIDkey in associationData['studyIDsToMetaData']) {
        for (trait in associationData['studyIDsToMetaData'][studyIDkey]['traits']) {
            superPopList = associationData['studyIDsToMetaData'][studyIDkey]['traits'][trait]['superPopulations']
            preferredPop = getPreferredPop(superPopList, superPop)
            allSuperPops.push(preferredPop)
        }
    }

    clumpsData = {}

    for (i=0; i<allSuperPops.length; i++) {
        clumpsData[allSuperPops[i]] = await getClumpsFromPositions(associationData['associations'], refGen, allSuperPops[i]);
    }

    mafData = (mafCohort == 'user' ? {} : await getMafData(associationData['associations'], mafCohort, refGen))
    percentileData = await getPercentiles(studyList, mafCohort)

    //if in text input mode
    if (document.getElementById('textInputButton').checked) {
        var textArea = document.getElementById('input');

        //if text input is empty, return error
        if (!textArea.value) {
            msg = "Please input RS IDs by hand according to the procedures above or import a VCF file using the \"File Upload\" and then the \"Choose File\" buttons above (step 1)."
            updateResultBoxAndStoredValue(msg)
            alert(msg)
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
                msg = "Invalid SNP id \"" + snpArray[0] + "\". Each ID should start with \"rs\" followed by a string of numbers."
                updateResultBoxAndStoredValue(msg)
                alert(msg)
                return;
            }
            if (snpArray.length > 2) {
                msg = "Invalid SNP \"" + snp + "\". Each SNP entry should only contain one colon."
                updateResultBoxAndStoredValue(msg)
                alert(msg);
                return;
            }
            else if (snpArray.length == 2) {
                //get the alleles in list form
                var alleleArray = snpArray[1].split(",");
                //if more than 2 alleles, return error
                if (alleleArray.length > 2) {
                    msg = "Too many alleles for \"" + snp + "\". Each SNP should have a maximum of two alleles."
                    updateResultBoxAndStoredValue(msg)
                    alert(msg);
                    return;
                }
                for (var j = 0; j < alleleArray.length; ++j) {
                    //if any allele is not  A, T, G, or C, return error
                    if (!/^[GTAC]+$/.test(alleleArray[j])) {
                        msg = "Allele \"" + alleleArray[j] + "\" is invalid. Must contain only A, T, G, and C's."
                        updateResultBoxAndStoredValue(msg)
                        alert(msg);
                        return;
                    }
                }
            }
            snpObj = {
                snp: snpArray[0],
                alleleArray: alleleArray
            }
            snpObjs.set(snpArray[0], snpObj);
        }
        handleCalculateScore(snpObjs, associationData, mafData, percentileData, superPop, clumpingType, clumpsData, pValue, mafThreshold, false, false);
    }
    else {
        //if text input is empty, return error
        if (typeof vcfFile === "undefined") {
            msg = "Please import a VCF file using the \"Choose File\" button above or input RS IDs by hand using the \"Text input\" button above (Sample(s) section)."
            updateResultBoxAndStoredValue(msg)
            alert(msg)
            return;
        }
        else {
            var extension = vcfFile.name.split(".").pop();
            if (extension.toLowerCase() != "vcf") {
                //if here, the user uploded a file with an invalid format
                msg = "Invalid file format. Check that your file is an unzipped vcf file and try again.\n" +
                        "Please note that the web version of PRSKB does not support zipped files,\n"+ 
                        "but that the command line interface does. It is available for download\n" +
                        "above under the \"Download\" tab or at https://prs.byu.edu/cli_download.html"
                updateResultBoxAndStoredValue(msg)
                alert(msg);
                                                
                return;
            }
            handleCalculateScore(vcfFile, associationData, mafData, percentileData, superPop, clumpingType, clumpsData, pValue, mafThreshold, true, (mafCohort == 'user' ? true : false));
        }
    }
}

/**
 * 
 * @param {*} gwasUploadFile the uploaded tab separated GWAS data file
 * @param {*} gwasRefGen the reference genome of the GWAS upload data
 * @param {*} refGen the reference genome of the samples
 * @param {*} gwasValueType the type of values reported (beta or odds ratios(or))
 * @returns the associations data object used in calculating polygenic risk scores
 */
async function getGWASUploadData(gwasUploadFile, gwasRefGen, refGen, gwasValueType) {
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
    bvi = -1 //beta value index
    bui = -1 //beta units index
    pvi = -1 //p value index
    cti = -1 // optional citation index
    rti = -1 // optional reported trait index
    pvai = -1 // optional p-value annotation index
    bai = -1 // optional beta annotation index

    for (i=0; i<fileLines.length; i++) {
        if (fileLines[i].toLowerCase().replace(/\n/,'').replace(/\r$/, '') == "") {
            // console.log("BLANK LINE IN GWAS UPLOAD -- SKIPPING")
            continue
        }
        else if (i==0) {
            cols = fileLines[i].toLowerCase().replace(/\n/,'').replace(/\r$/, '').split('\t')
            sii = cols.indexOf("study id")
            ti = cols.indexOf("trait")
            si = cols.indexOf("rsid")
            ci = cols.indexOf("chromosome")
            pi = cols.indexOf("position")
            rai = cols.indexOf("risk allele")
            ori = cols.indexOf("odds ratio")
            bvi = cols.indexOf("beta coefficient")
            bui = cols.indexOf("beta units")
            pvi = cols.indexOf("p-value")
            cti = cols.indexOf("citation")
            rti = cols.indexOf("reported trait")
            pvai = cols.indexOf('p-value annotation')
            bai = cols.indexOf('beta annotation')

            if (sii == -1 || ti == -1 || si == -1 || ci == -1 || pi == -1 || rai == -1 || ori == -1  && gwasValueType == 'or' || bvi == -1 && bui == -1 && gwasValueType == 'beta' || pvi == -1) {
                console.log(sii, ti, si, ci, pi, rai, ori, bvi, bui, pvi)
                msg = "The format of your GWAS upload is incorrect. Please fix it and try again."
                updateResultBoxAndStoredValue(msg)
                alert(msg)
                return
            }
        }
        else {
            cols = fileLines[i].replace(/\n/,'').replace(/\r$/, '').split('\t')
            const studyIDregex = /GCST[0-9]*/
            //ensuring that the studyID doesn't have any weird characters at the end
            cols[sii] = cols[sii].match(studyIDregex)[0]
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
                associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]] = {}
            }

            pValueAnnotation = (pvai != -1 ? cols[pvai] : "NA")
            betaAnnotation = (bai != -1 ? cols[bai] : "NA")
            pValBetaAnnoValType = pValueAnnotation + "|" + betaAnnotation + "|" + gwasValueType
            if (!(pValBetaAnnoValType in associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]])) {
                associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]][pValBetaAnnoValType] = {}
            }
            if (!(cols[rai] in associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]][pValBetaAnnoValType])) {
                associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]][pValBetaAnnoValType][cols[rai]] = {
                    pValue: parseFloat(cols[pvi]),
                    sex: "NA",
                    ogValueTypes: gwasValueType,
                }
                if (gwasValueType == 'or') {
                    associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]][pValBetaAnnoValType][cols[rai]]['oddsRatio'] = parseFloat(cols[ori])
                }
                else {
                    associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]][pValBetaAnnoValType][cols[rai]]['betaValue'] = parseFloat(cols[bvi]),
                    associationsDict[cols[si]]["traits"][cols[ti]][cols[sii]][pValBetaAnnoValType][cols[rai]]['betaUnit'] = cols[bui]
                }
            }
            else {
                msg = "You have more than one association for the same Trait/study/(pValueAnnotation|betaAnnotation) combination. Please fix this before attempting to run the PRSKB calculator."
                updateResultBoxAndStoredValue(msg)
                alert(msg)
                return
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
                studyIDsToMetaData[cols[sii]]["traits"][cols[ti]] = {
                    studyTypes: [],
                    pValBetaAnnoValType: [pValBetaAnnoValType],
                    superPopulations: []
                }
            }
            else {
                if (!(studyIDsToMetaData[cols[sii]]["traits"][cols[ti]]['pValBetaAnnoValType'].includes(pValBetaAnnoValType))) {
                    studyIDsToMetaData[cols[sii]]["traits"][cols[ti]]['pValBetaAnnoValType'].push(pValBetaAnnoValType)
                }
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
//TODO this will need to be updated
function getChromPosToSnps(refGen, snps) {
    return Promise.resolve($.ajax({
        type: "GET",
        url: "/snps_to_chrom_pos",
        data: { snps: snps, refGen: refGen },
        success: async function (data) {
            return data
        },
        error: function (XMLHttpRequest) {
            msg = `There was an error retrieving required snps data: ${XMLHttpRequest.responseText}`
            updateResultBoxAndStoredValue(msg)
            alert(msg)
        }
    }));
}

/**
 * Resets resultJSON
 */
function resetOutput() {
    resultJSON = "";
}

/**
 * Greps the snpsInput using the associationsData obj, removing SNPs from the snpsInput object that are not in the
 * associationData object. Returns a list containinig the greppedSNPs object and a number: the total number of variants
 * in the original snpsInput object
 * @param {*} snpsInput 
 * @param {*} associationData 
 * @param {*} isVCF 
 * @returns 
 */
var getGreppedSnpsAndTotalInputVariants = async (snpsInput, associationData, isVCF, userMAF) => {
    //Gets a map of pos/snp -> {snp, pos, oddsRatio, allele, study, trait}
    var associMap = associationData['associations']
    var allAssociMapKeys = Object.keys(associMap)
    allNeededSnps = allAssociMapKeys.filter(function (snp) {
        return snp.startsWith("rs");
      });
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
            greppedSNPsAndMAF = vcf_parser.getVCFObj(reducedVCFLines, userMAF, allNeededSnps, associMap);
            return [greppedSNPsAndMAF[0], greppedSNPsAndMAF[1], greppedSNPsAndMAF[2], totalInputVariants]
        }
        catch (err) {
            updateResultBoxAndStoredValue(getErrorMessage(err))
            alert(getErrorMessage(err));
            return;
        }
    }
    else {
        var greppedSNPsList = [];
        var usedSnps = []
        totalInputVariants = snpsInput.size;
        for (const key of snpsInput.keys()) {
            if (key in associMap) {
                usedSnps.push(key)
                greppedSNPsList.push(snpsInput.get(key));
            }
        }
        //Impute missing Snps - txt
        snpsToImpute = $(allNeededSnps).not(usedSnps).toArray()
        for (i=0; i<snpsToImpute.length; i++) {
            greppedSNPsList.push({
                snp: snpsToImpute[i],
                alleleArray: [".", "."]
            })
        }
        var greppedSNPs = new Map();
        greppedSNPs.set("TextInput", greppedSNPsList);
        return [greppedSNPs, {}, usedSnps, totalInputVariants]
    }
}

/**
 * Calculates score for the file input from the user
 * @param {*} snpsInput- the file or text input by the user (specifiying snps of interest)
 * @param {*} associationData- the associations from get_associations (specifying traits and studies for calculations)
 * @param {*} clumpsData - the clumping data needed to 
 * @param {*} pValue- the pvalue cutoff for scores
 * @param {*} isVCF - whether the user gave us a VCF file or SNP text
 * No return- prints the simplified scores result onto the webpage
 */
var handleCalculateScore = async (snpsInput, associationData, mafData, percentileData, preferredPop, clumpingType, clumpsData, pValue, mafThreshold, isVCF, userMAF) => {
    var greppedSNPsMAFAndtotalInputVariants = await getGreppedSnpsAndTotalInputVariants(snpsInput, associationData, isVCF, userMAF)
    var greppedSNPs = greppedSNPsMAFAndtotalInputVariants[0]
    var userMAFData = greppedSNPsMAFAndtotalInputVariants[1]
    var presentSnps = greppedSNPsMAFAndtotalInputVariants[2]
    var totalInputVariants = greppedSNPsMAFAndtotalInputVariants[3]
    
    if (!(Object.keys(userMAFData).length === 0) && userMAF) {
        mafData = userMAFData
    }

    try {
        var result = await calculateScore(associationData, mafData, presentSnps, preferredPop, clumpingType, clumpsData, percentileData, greppedSNPs, pValue, mafThreshold, totalInputVariants);
        try {
            result = JSON.parse(result)
        } catch (e) {
            //todo create an endpoint that we can send errors to and give a better error response for the user
            console.log("There was an error in calculating the results. Please try again.")
        }
        if (result == {}) {
            $('#response').html("None of the snps from the input file were found.");
        }
        else if (result["studyResults"] == "No results to display") {
            msg = "We were not able to caluclate results using the given values. Try adjusting the p-value cutoff or the MAF threshold."
            updateResultBoxAndStoredValue(msg)
            alert(msg)
            return
        }
        else {
            //shortens the result for website desplay
            outputVal = getSimpleOutput(result)
            $('#response').html(outputVal);
        }
        //saves the full result on currently open session of the website for further modifications 
        resultJSON = result;
        //go the the result output box
        $('#responseBox')[0].scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        })
    }
    catch (err) {
        updateResultBoxAndStoredValue(getErrorMessage(err))
        alert(getErrorMessage(err));
    }
}


/**
 * Calculates the polygenic risk scores for the greppedSamples data using the associationData object, with clumpsData and
 * pValue acting as filters. pValue and totalInputVariants are aditional statistics returned in the final json
 * The complete json returned is composed of two objects: the result including risk scores for all samples, studies, and
 * traits
 * @param {*} associationData 
 * @param {*} clumpsData 
 * @param {*} greppedSamples 
 * @param {*} pValue 
 * @param {*} totalInputVariants 
 * @returns 
 */
var calculateScore = async (associationData, mafData, presentSnps, preferredPop, clumpingType, clumpsData, percentileData, greppedSamples, pValue, mafThreshold, totalInputVariants) => {
    var resultObj = {};
    var indexSnpObj = {};
    var resultJsons = {};

    var traitNodes = document.querySelectorAll('#traitSelect :checked');
    var selectedTraits = [...traitNodes].map(option => option.value);

    if (greppedSamples == undefined) {
        throw "The input was undefined when calculating the score. Please check your input file or text or reload the page and try again."
    }
    else {
        //add information to results
        resultJsons = { 
            pValueCutoff: pValue, 
            mafThreshold: mafThreshold,
            totalVariants: totalInputVariants,
            studyResults: {}
        }
        //if the input data has at least one individual
        if (greppedSamples.size > 0) {
            studyIDs = Object.keys(associationData['studyIDsToMetaData'])
            studyIDs.sort()
            //for each individual, get a map containing all studies to the oddsRatios, snps and pos associated to each study and individual
            //then convert this map into the right format for results
            //for each individual and their snp info in the vcf object
            for (const [individualName, individualSNPObjs] of greppedSamples.entries()) {
                for (i=0; i < studyIDs.length; i++) {
                    for (trait in associationData['studyIDsToMetaData'][studyIDs[i]]['traits']) {
                        for (j=0; j < associationData['studyIDsToMetaData'][studyIDs[i]]['traits'][trait]['pValBetaAnnoValType'].length; j++) {
                            pValBetaAnnoValType = associationData['studyIDsToMetaData'][studyIDs[i]]['traits'][trait]['pValBetaAnnoValType'][j]
                            // ensure that the right studies/traits are being used and that this matches the CLI
                            if (selectedTraits.length == 0 || selectedTraits.includes(trait) || selectedTraits.includes(associationData['studyIDsToMetaData'][studyIDs[i]]["reportedTrait"])) {
                                printStudyID = studyIDs[i]
                                if (!(printStudyID in resultObj)) {
                                    resultObj[printStudyID] = {}
                                }
                                if (!(trait in resultObj[printStudyID])) {
                                    resultObj[printStudyID][trait] = {}
                                }
                                if (!(pValBetaAnnoValType in resultObj[printStudyID][trait])) {
                                    resultObj[printStudyID][trait][pValBetaAnnoValType] = {}
                                }
                                if (!(individualName in resultObj[printStudyID][trait][pValBetaAnnoValType])) {
                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName] = {
                                        snps: {},
                                        variantsWithUnmatchedAlleles: [],
                                        variantsInHighLD: [],
                                        variantsWithMissingGenotypes: [],
                                        snpOverlap: [],
                                        snpsExcludedDueToCutoffs: [],
                                        totalSnps: [],
                                        usedSuperPopulation: ""
                                    }
                                }
                                if (!([trait, studyIDs[i], pValBetaAnnoValType, individualName].join("|") in indexSnpObj)) {
                                    indexSnpObj[[trait, studyIDs[i], pValBetaAnnoValType, individualName].join("|")] = {}
                                }
                            }
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

                    if (key in associationData['associations']) {
                        for (trait in associationData['associations'][key]['traits']) {
                            for (studyID in associationData['associations'][key]['traits'][trait]) {
                                printStudyID = studyID
                                superPopList = associationData['studyIDsToMetaData'][printStudyID]['traits'][trait]['superPopulations']
                                superPopToUse = getPreferredPop(superPopList, preferredPop)
                                for (pValBetaAnnoValType in associationData['associations'][key]['traits'][trait][studyID]) {
                                    traitStudypValueAnnoValTypeSamp = [trait, studyID, pValBetaAnnoValType, individualName].join("|")
                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['usedSuperPopulation'] = superPopToUse
                                    for (riskAllele in associationData['associations'][key]['traits'][trait][studyID][pValBetaAnnoValType]) {
                                        associationObj = associationData['associations'][key]['traits'][trait][studyID][pValBetaAnnoValType][riskAllele]
                                        snpMafThreshold = (key in mafData && riskAllele in mafData[key]['alleles'] ? mafData[key]['alleles'][riskAllele] : 0)
                                        if (associationObj.pValue <= parseFloat(pValue) && snpMafThreshold >= mafThreshold) {
                                            if (presentSnps.includes(key)){
                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snpOverlap'].push(key)
                                            }
                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['totalSnps'].push(key)
                                            numAllelesMatch = 0
                                            numAlleleMissingGenotype = 0
                                            for (i=0; i < alleles.length; i++) {
                                                allele = alleles[i]
                                                if (allele == riskAllele){
                                                    numAllelesMatch++;
                                                }
                                                else if (allele == '.') {
                                                    numAlleleMissingGenotype++;
                                                    //todo should this be in the normal or separated like this?
                                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['variantsWithMissingGenotypes'].push(key)
                                                }
                                                else {
                                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['variantsWithUnmatchedAlleles'].push(key)
                                                }
                                            }
    
                                            // If there is a matching risk allele for this SNP or sample-wide LD clumping was requested, move forward
                                            if ((numAllelesMatch > 0) || (clumpingType === 'sample')) {
                                                if (clumpsData !== undefined && key in clumpsData[superPopToUse]) {
                                                    clumpNum = clumpsData[superPopToUse][key]['clumpNum']
                                                    if (clumpNum in indexSnpObj[traitStudypValueAnnoValTypeSamp]) {
                                                        const [indexClumpSnp, indexRiskAllele] = indexSnpObj[traitStudypValueAnnoValTypeSamp][clumpNum]
                                                        indexPvalue = associationData['associations'][indexClumpSnp]['traits'][trait][studyID][pValBetaAnnoValType][indexRiskAllele]['pValue']
                                                        if (associationObj.pValue < indexPvalue) {
                                                            delete resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][indexClumpSnp] //TODO test that this worked
                                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['variantsInHighLD'].push(indexClumpSnp)
                                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key] = {}
                                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAllelesMatch'] = numAllelesMatch
                                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAlleleMissingGenotype'] = numAlleleMissingGenotype
                                                            if (numAlleleMissingGenotype > 0) {
                                                                if (key in mafData && riskAllele in mafData[key]['alleles']){
                                                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['MAF'] = mafData[key]['alleles'][riskAllele]
                                                                }
                                                            }
                                                            indexSnpObj[traitStudypValueAnnoValTypeSamp][clumpNum] = [key, riskAllele]
                                                        }
                                                        else {
                                                            // Check to see if the current index SNP for this clump had a matching risk allele
                                                            indexNumMatchingAlleles = resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][indexClumpSnp]['numAllelesMatch']
                                                            // Even though the p-value for the current SNP is > the p-value of the index SNP, replace the index SNP if individual LD clumping was requested and there were no matching risk alleles for the index SNP (meaning the alleles were ./. and derived from MAF
                                                            if ((indexNumMatchingAlleles < 1) && (clumpingType === 'individual')) {
                                                                delete resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][indexClumpSnp] //TODO test that this worked
                                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['variantsInHighLD'].push(indexClumpSnp)
                                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key] = {}
                                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAllelesMatch'] = numAllelesMatch
                                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAlleleMissingGenotype'] = numAlleleMissingGenotype
                                                                if (numAlleleMissingGenotype > 0) {
                                                                    if (key in mafData && riskAllele in mafData[key]['alleles']){
                                                                        resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['MAF'] = mafData[key]['alleles'][riskAllele]
                                                                    }
                                                                }
                                                                indexSnpObj[traitStudypValueAnnoValTypeSamp][clumpNum] = [key, riskAllele]
                                                            } else {
                                                                // add the current snp to neutral snps
                                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['variantsInHighLD'].push(key)
                                                            }
                                                        }
                                                    }
                                                    else {
                                                        // add the clumpNum/key to the indexSnpObj
                                                        indexSnpObj[traitStudypValueAnnoValTypeSamp][clumpNum] = [key, riskAllele]
                                                        resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key] = {}
                                                        resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAllelesMatch'] = numAllelesMatch
                                                        resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAlleleMissingGenotype'] = numAlleleMissingGenotype
                                                        if (numAlleleMissingGenotype > 0) {
                                                            if (key in mafData && riskAllele in mafData[key]['alleles']){
                                                                resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['MAF'] = mafData[key]['alleles'][riskAllele]
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    // just add the snp to calculations
                                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key] = {}
                                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAllelesMatch'] = numAllelesMatch
                                                    resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['numAlleleMissingGenotype'] = numAlleleMissingGenotype
                                                    if (numAlleleMissingGenotype > 0) {
                                                        if (key in mafData && riskAllele in mafData[key]['alleles']){
                                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['MAF'] = mafData[key]['alleles'][riskAllele]
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        else {
                                            resultObj[printStudyID][trait][pValBetaAnnoValType][individualName]['snps'][key]['snpsExcludedDueToCutoffs']
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
                    atLeastOneGoodPValueAnno = false
                    for (pValBetaAnnoValType in resultObj[studyID][trait]) {
                        tmpPValueAnnoObj = {}
                        atLeastOneGoodSamp = false
                        for (sample in resultObj[studyID][trait][pValBetaAnnoValType]) {
                            uniqueKey = [trait, pValBetaAnnoValType, studyID].join("|")
                            percentileObj = uniqueKey in percentileData ? percentileData[uniqueKey] : {}
                            scoreAndSnps = calculateCombinedScoreAndFormatSnps(resultObj[studyID][trait][pValBetaAnnoValType][sample], percentileObj, trait, studyID_og, pValBetaAnnoValType, associationData)
                            tmpSampleObj = {
                                protectiveVariants: scoreAndSnps[4],
                                riskVariants: scoreAndSnps[3],
                                unmatchedVariants: scoreAndSnps[5],
                                clumpedVariants: scoreAndSnps[6],
                                snpOverlap: scoreAndSnps[7],
                                snpsExcludedDueToCutoffs: scoreAndSnps[8],
                                totalSnps: scoreAndSnps[9],
                                percentile: scoreAndSnps[10],
                                usedSuperPopulation: resultObj[studyID][trait][pValBetaAnnoValType][sample]['usedSuperPopulation']
                            }
                            if (scoreAndSnps[1] == 'oddsRatio') {
                                tmpSampleObj['oddsRatio'] = scoreAndSnps[0]
                            }
                            else {
                                tmpSampleObj['betaValue'] = scoreAndSnps[0]
                                tmpSampleObj['betaUnit'] = scoreAndSnps[2]
                            }
                            tmpPValueAnnoObj[this.trim(sample)] = tmpSampleObj
                            if ((scoreAndSnps[1] == 'oddsRatio' && tmpSampleObj.oddsRatio != "NF") || tmpSampleObj.unmatchedVariants.length != 0 || (scoreAndSnps[1] == 'betaValue' && tmpSampleObj.betaValue != "NF")) {
                                atLeastOneGoodSamp = true
                            }
                        }
                        if (atLeastOneGoodSamp) {
                            tmpTraitObj[pValBetaAnnoValType] = tmpPValueAnnoObj
                            atLeastOneGoodPValueAnno = true
                        }
                    }
                    if (atLeastOneGoodPValueAnno) {
                        tmpStudyObj['traits'][trait] = tmpTraitObj
                    }
                    else {
                        tmpStudyObj['traits'][trait] = {}
                        delete tmpStudyObj['traits'][trait]
                    }
                }
                if (atLeastOneGoodPValueAnno) {
                    resultJsons['studyResults'][studyID] = tmpStudyObj
                }
            }
        }
        //if the input data doesn't have an individual in it (we can assume this is a text input query with no matching SNPs)
        if (Object.keys(resultJsons['studyResults']).length == 0) {
            resultJsons['studyResults'] = "No results to display"
        }
        //convert the result JSON list to a string and return
        return JSON.stringify(resultJsons);
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
function calculateCombinedScoreAndFormatSnps(sampleObj, percentileObj, trait, studyID, pValBetaAnnoValType, associationData) {
    var combinedScore = 0;
    var protective = new Set()
    var risk = new Set()
    var unmatched = new Set(sampleObj.variantsWithUnmatchedAlleles)
    var clumped = new Set(sampleObj.variantsInHighLD)
    var ploidy = 2
    var nonMissingSnps = 0 // this is the number of non-missing snps obbserved in sample
    var snpOverlap = new Set(sampleObj.snpOverlap)
    var excludedSnps = new Set(sampleObj.snpsExcludedDueToCutoffs)
    var totalSnps = new Set(sampleObj.totalSnps)

    valueType = 'betaValue'
    changed = 0
    betaUnits = "NA"

    //calculate the odds ratio and determine which alleles are protective, risk, and neutral
    for (snp in sampleObj['snps']) {
        nonMissingSnpsForSnp = 0
        for (allele in associationData['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType]){
            if (associationData['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType][allele]['ogValueTypes'].toLowerCase() == 'or' && valueType == 'betaValue') {
                valueType = 'oddsRatio'
                changed += 1
            }
            if (valueType == 'oddsRatio' && changed > 1) {console.log("THIS SHOULDN'T BE HAPPENING!! NEED TO ADD ANOTHER LEVEL TO THE ASSOCIATIONS OBJECT")}
            snpDosage = sampleObj['snps'][snp]['numAllelesMatch']
            snpMissingGenotype = sampleObj['snps'][snp]['numAlleleMissingGenotype']
            maf = ("MAF" in sampleObj['snps'][snp] ? sampleObj['snps'][snp]['MAF'] : 0)
            snpBeta = (valueType == 'betaValue' ? associationData['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType][allele][valueType] : Math.log(associationData['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType][allele][valueType]))
            combinedScore += ((snpBeta * snpDosage) + (snpBeta * maf * snpMissingGenotype))
            if (snpDosage + snpMissingGenotype != 0) {nonMissingSnpsForSnp += 1}
            if (snpBeta > 0) {
                risk.add(snp)
            }
            else if (snpBeta < 0) {
                protective.add(snp)
            }
            betaUnits = associationData['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType][allele]['betaUnit']
        }
        //This is to ensure that if we have multiple alleles for the same snp, and that snp was imputed, we only count the snp 1 time
        if (nonMissingSnpsForSnp > 1){ 
            nonMissingSnps += 1 
        } else { 
            nonMissingSnps += nonMissingSnpsForSnp 
        }
    }

    if (combinedScore === 0) {
        combinedScore = "NF"
    } else {
        combinedScore = combinedScore / (ploidy * nonMissingSnps)
        // switch the score back to odds ratios
        if (valueType == 'oddsRatio') {combinedScore = Math.exp(combinedScore)}
    }

    percentile = getPercentile(combinedScore, percentileObj, false)

    return [combinedScore, valueType, betaUnits, Array.from(risk), Array.from(protective), Array.from(unmatched), Array.from(clumped), snpOverlap.length, excludedSnps.length, totalSnps.length, percentile]
}

// This function determines the percentile (or percentile range) of the prs score
function getPercentile(prs, percentileDict, omitPercentiles){
    if (prs == "NF") {
        return "NA"
    }
    prs = parseFloat(prs)
    if (omitPercentiles || percentileDict == {}) {
        return "NA"
    }
    lb = 0 // keeps track of the lower bound percentile
    ub = 0 // keeps track of the upper bound percentile
    for (i = 0; i < 101; i++){
        key = `p${i}`
        // if the prs is greater than or equal to the score at the i-th percentile, and the score doesn't match the score at the lower bound, set the lower and upper bounds to i
        if (prs >= percentileDict[key] && percentileDict[key] != percentileDict[`p${lb}`]) {
            ub = i
            lb = i
        }
        // else if the prs is greater than or equal to the score at the i-th percentile, set the upper bound to the i-th percentile
        else if (prs >= percentileDict[key]) {
            ub = i
        }
        // else the prs is less than the score at the i-th percentile and we are done
        else {
            break
        }
    }

    // if the lower bound is less than the upper bound, send back the range of percentiles
    if (lb < ub) {
        return `${lb}-${ub}`
    }
    // else return just the lower bound
    else{
        return `${lb}`
    } 
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
function getErrorMessage(err) {
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
 * Returns a simplified output using the given JSON. The JSON is truncated and converted to the correct format.
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
        headerInit = ['Study ID', 'Reported Trait', 'Trait', 'Citation', 'P-Value Annotation', 'Beta Annotation', 'Score Type', 'Units (if applicable)', 'SNP Overlap', 'SNPs Excluded Due To Cutoffs', 'Total SNPs', 'Used Super Population']
    }
    else {
        headerInit = ['Sample', 'Study ID', 'Reported Trait', 'Trait', 'Citation', 'P-Value Annotation', 'Beta Annotation', 'Score Type', 'Units (if applicable)', 'SNP Overlap', 'SNPs Excluded Due To Cutoffs', 'Total SNPs', 'Used Super Population', 'Polygenic Risk Score', 'Percentile', 'Protective Variants', 'Risk Variants', 'Variants without Risk Allele', 'Variants in High LD']
    }

    resultsString = ''

    studyIDKeys = Object.keys(jsonObject['studyResults'])

    first = true
    for (var i = 0; i < studyIDKeys.length; i++) {
        studyID = studyIDKeys[i]
        traitKeys = Object.keys(jsonObject['studyResults'][studyID]['traits'])
        for (var j = 0; j < traitKeys.length; j++) {
            trait = traitKeys[j]
            pValBetaAnnoValTypeKeys = Object.keys(jsonObject['studyResults'][studyID]['traits'][trait])
            for (var p = 0; p < pValBetaAnnoValTypeKeys.length; p++) {
                pValBetaAnnoValType = pValBetaAnnoValTypeKeys[p]
                sepValues = pValBetaAnnoValType.split("|")
                pValAnno = sepValues[0]
                betaAnno = sepValues[1]
                valType = sepValues[2]
                lineInfo = [studyID, jsonObject['studyResults'][studyID]['reportedTrait'], trait, jsonObject['studyResults'][studyID]['citation'], pValAnno, betaAnno, valType]
                if (first) {
                    first = false
                    sampleKeys = Object.keys(jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType])
                    if (isCondensed) {
                        resultsString = headerInit.join("\t") + "\t" + sampleKeys.join("\t")
                    }
                    else {
                        resultsString = headerInit.join("\t")
                    }
                }

                for (var k = 0; k < sampleKeys.length; k++) {
                    sample = sampleKeys[k]
                    oddsRatio = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['oddsRatio']
                    betaValue = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['betaValue']
                    betaUnit = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['betaUnit']
                    snpOverlap = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['snpOverlap']
                    excludedSnps = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['snpsExcludedDueToCutoffs']
                    totalSnps = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['totalSnps']
                    usedSuperPopulation = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['usedSuperPopulation']
                    if (k==0) {
                        lineInfo.push(betaUnit)
                    }
                    score = (betaValue !== undefined ? betaValue : oddsRatio)
                    if (isCondensed) {
                        if (k==0){
                            lineInfo.push(snpOverlap)
                            lineInfo.push(excludedSnps)
                            lineInfo.push(totalSnps)
                            lineInfo.push(usedSuperPopulation)
                        }
                        lineInfo.push(score)
                    }
                    else {
                        protectiveSnps = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['protectiveVariants']
                        riskSnps = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['riskVariants']
                        // unmatchedSnps are variants present in an individual, but with an allele other than the risk allele
                        unmatchedSnps = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['unmatchedVariants']
                        // clumpedSnps are variants in LD with a variant with a more significant p-value, so their odds ratio isn't included in the prs calculation
                        clumpedSnps = jsonObject['studyResults'][studyID]['traits'][trait][pValBetaAnnoValType][sample]['clumpedVariants']

                        // set the arrays to "." if they are empty, otherwise join them on bar ("|")
                        protectiveSnps = (protectiveSnps.length == 0) ? "." : protectiveSnps.join("|")
                        riskSnps = (riskSnps.length == 0) ? "." : riskSnps.join("|")
                        unmatchedSnps = (unmatchedSnps.length == 0) ? "." : unmatchedSnps.join("|")
                        clumpedSnps = (clumpedSnps.length == 0) ? "." : clumpedSnps.join("|")

                        lineResult = `${sample}\t${lineInfo.join('\t')}\t${snpOverlap}\t${excludedSnps}\t${totalSnps}\t${usedSuperPopulation}\t${score}\t${protectiveSnps}\t${riskSnps}\t${unmatchedSnps}\t${clumpedSnps}`
                        resultsString = resultsString.concat("\n", lineResult)
                    }
                }
                if (isCondensed) {
                    resultsString = resultsString + "\n" + lineInfo.join("\t")
                }
            }
        }
    }

    return resultsString;
}

/**
 * Updates the result output box on the web page. The full result JSON is truncated and then formatted based on the 
 * file type (JSON or TSV) and format (condensed, uncondensed)
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

/**
 * Returns a string for the jsonObject formated based on the file type (JSON or TSV) and format (condensed, uncondensed)
 * @param {*} jsonObject 
 * @returns output string
 */
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

/**
 * Downloads the results of the calculations in a zip file named polyscore_<random int>.zip
 */
function downloadResults() {
    if (resultJSON == {}) {
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

    download([fileName], extension, [resultText]);
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
            /* compression level ranges from 1 (best speed) to 9 (best compression) */
            level: 5
        }
    })
        .then(function (content) {
            // see FileSaver.js
            saveAs(content, filenameArray[0] + ".zip");
            document.getElementById("download-bar").style.visibility = "hidden";
        });
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
        msg = "Error loading the example file. Please try again"
        updateResultBoxAndStoredValue(msg)
        alert(msg)
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

/**
 * Loads the sampleGWAS.tsv example file for later calculation usage
 */
function exampleGWASInput() {
    var result = null;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', "sampleGWAS.tsv");
    var errorLoading = function(pe) {
        msg = "Error loading the example GWAS file. Please try again"
        updateResultBoxAndStoredValue(msg)
        alert(msg)
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

        $("#mafCohort option[value=user]").remove()
        document.getElementById("sample-info").style.display = "none";
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

        var mafSelector = document.getElementById("mafCohort");
        var opt = document.createElement('option');
        var displayString = "User VCF maf";
        opt.appendChild(document.createTextNode(displayString));
        opt.value = "user";
        mafSelector.appendChild(opt);
        document.getElementById("sample-info").style.display = "initial";
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

function changeMAF() {
    resetOutput()
    updateResultBoxAndStoredValue("");
}
