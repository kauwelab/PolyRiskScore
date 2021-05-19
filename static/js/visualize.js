var displayDataObj = {}

function getTraits() {

    //call the API and populate the traits dropdown with the results
    $.ajax({
        type: "GET",
        url: "cohort_get_traits",
        success: async function (data) {
            traitsList = data;
            var selector = document.getElementById("trait-Selector");
            for (i = 0; i < traitsList.length; i++) {
                var opt = document.createElement('option')
                opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(traitsList[i])))
                opt.value = traitsList[i]
                selector.appendChild(opt);
            }
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the traits: ${XMLHttpRequest.responseText}`);
        }
    })
}

function getStudies() {
    var traitSelector = document.getElementById("trait-Selector");
    var studyTypeSelector = document.getElementById("studyType-Selector");

    if (traitSelector.value != "default" && studyTypeSelector.value != "default"){
        trait = traitSelector.value
        studyTypes = [studyTypeSelector.value]
        if (studyTypeSelector.value == "ALL"){
            studyTypes = ["HI", "LC", "O"]
        }
        
        $('#study-Selector').replaceWith("<select id='study-Selector' style='margin-top: 2em; margin-bottom: 2em;' disabled onchange=\'getCohorts()\'> <option selected='selected' value='default'>Select a Study</option> </select>");
        var studySelector = document.getElementById("study-Selector");
        
        $.ajax({
            type: "GET",
            url: "/cohort_get_studies",
            data: { trait: trait, studyTypes: studyTypes },
            success: async function (studyLists) {

                if (studyLists.length == 0) {
                    alert(`No results were found using the specified filters. Try using different filters.`)
                    resetFilters();
                    return
                }

                for (i = 0; i < studyLists.length; i++) {
                    studyObj = studyLists[i]
                    var trait = studyObj.trait
                    var studyID = studyObj.studyID
                    var displayString = trait + " | " + studyObj.citation + " | " + studyID

                    var opt = document.createElement('option');
                    opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(displayString)));
                    opt.value = studyID;
                    opt.setAttribute('data-altmetric-score', studyObj.altmetricScore);
                    opt.setAttribute('data-citation', studyObj.citation);
                    opt.setAttribute('data-title', studyObj.title);
                    opt.setAttribute('data-pubmedid', studyObj.pubMedID);
                    opt.setAttribute('data-reported-trait', studyObj.reportedTrait);
                    opt.setAttribute('data-trait', trait);
                    studySelector.appendChild(opt);
                }
            },
            error: function (XMLHttpRequest) {
                alert(`There was an error loading the studies`);
                resetFilters();
                return
            }
        })

        studySelector.disabled = false;
    }
}

function getCohorts() {
    var studySelector = document.getElementById("study-Selector");
    selectedStudy = studySelector.options[studySelector.selectedIndex]
    studyID = studySelector.value;
    trait = selectedStudy.getAttribute("data-trait")
    var cohortSelector = document.getElementById("cohort-Selector");
    cohortSelector.disabled = false;
    cohortSelectorList = cohortSelector.options

    cohortValueToText = {
        ukbb: "UK Biobank",
        afr: "1000 Genomes - AFR population",
        amr: "1000 Genomes - AMR population",
        eas: "1000 Genomes - EAS population",
        eur: "1000 Genomes - EUR population",
        sas: "1000 Genomes - SAS population",
        adni_ad: "ADNI - Alzheimer's Disease",
        adni_mci: "ADNI - Mild Cognitive Impairment",
        adni_controls: "ADNI - Cognitively Normal"
    }

    //make sure the select is reset/empty so that the multiselect command will function properly
    $('#cohort-Selector').replaceWith("<select id='cohort-Selector' name='cohortSelector' style='margin-top: 2em; margin-bottom: 2em;' multiple></select>")
    var cohortSelector = document.getElementById("cohort-Selector");

    $.ajax({
        type: "GET",
        url: "cohort_get_cohorts",
        data: { trait: trait, studyID: studyID },
        success: async function (data) {
            cohortList = data;
            // ensure the correct cohort options are available
            for (i = 0; i < cohortList.length; i++) {
                var opt = document.createElement('option')
                var displayString = cohortValueToText[cohortList[i]];
                opt.appendChild(document.createTextNode(displayString));
                opt.value = cohortList[i];
                cohortSelector.appendChild(opt);
            }
            // order the studies (trait -> citation -> studyID)
            $("#cohort-Selector").html($("#cohort-Selector option").sort(function (a, b) {
                return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
            }))
            document.multiselect('#cohort-Selector');
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the traits: ${XMLHttpRequest.responseText}`);
        }
    })
}

function resetFilters() {
    var studyTypeSelector = document.getElementById("studyType-Selector");
    studyTypeSelector.value = 'default';

    var studySelector = document.getElementById("study-Selector");
    studySelector.value = 'default';
    studySelector.disabled = true;

    var cohortSelector = document.getElementById("cohort-Selector");
    cohortSelector.disabled = true;
}

function displayGraphs() {
    var studySelector = document.getElementById("study-Selector");
    selectedStudy = studySelector.options[studySelector.selectedIndex]
    studyID = studySelector.value;
    trait = selectedStudy.getAttribute("data-trait")

    var cohortNodes = document.querySelectorAll('#cohort-Selector :checked');
    var cohorts = [...cohortNodes].map(option => option.value)

    $.ajax({
        type: "GET",
        url: "/cohort_full_results",
        data: { trait: trait, studyID: studyID, cohort: cohorts },
        success: async function (data) {

            if (data.length == 0) {
                alert(`There was an error retrieving the data to display`)
            }
            else {
                //update the header name of the study
                var studyName = document.getElementById("studyName")
                studyName.innerText = selectedStudy.getAttribute("data-citation");
                studyName.hidden = false;
                displayDataObj = []

                if (!Array.isArray(data[0])) {
                    displayDataObj.push(data[0])
                }
                else {
                    for (i=0; i<data.length; i++) {
                        displayDataObj.push(data[i][0])
                    }
                }

                snpsString = ""

                for (i=0; i<displayDataObj.length; i++) {
                    const keys = Object.keys(displayDataObj[i]);
                    arrayOfValues = []

                    // iterate over keys and create datapoints
                    keys.forEach((key, index) => {
                        if (/^p[0-9]{1,3}$/.test(key)) {
                            arrayOfValues.push(displayDataObj[i][key])
                        }
                    });

                    displayDataObj[i]["arrayOfValues"] = arrayOfValues
                    snpsString = snpsString.concat(`<p><b>${displayDataObj[i]["cohort"].toUpperCase()} SNPs Used:</b> ${displayDataObj[i]["snps"].join(", ")}</p>`)
                }

                changePlot()
                displayTable()

                var studyMetadata = document.getElementById("studymetadata")
                metadatastring = `<p><b>Title:</b> ${selectedStudy.getAttribute("data-title")}</p>
                <p><b>Citation:</b> ${selectedStudy.getAttribute("data-citation")}</p>
                <p><b>Disease/Trait:</b> ${selectedStudy.getAttribute("data-trait")}</p>
                <p><b>Reported Trait:</b> ${selectedStudy.getAttribute("data-reported-trait")}</p>
                <p><b>Pubmed ID:</b> ${selectedStudy.getAttribute("data-pubmedid")}</p>
                <p><b>Altmetric Score:</b> ${selectedStudy.getAttribute("data-altmetric-score")}</p>`
                metadatastring = metadatastring.concat(snpsString)
                studyMetadata.innerHTML = metadatastring
            }
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies`);
        }
    })
}

function displayTable() {
    var tablePlot = document.getElementById("tablePlot");

    var values = [
        ['Min', 'Max', 'Median', 'Range', 'Mean', 'Geometric Mean', 'Harmonic Mean', "Standard Deviation", "Geometric Standard Deviation"],
    ]

    var headers = [["<b>Summary Values</b>"]]

    for (i=0; i<displayDataObj.length; i++) {
        values.push([displayDataObj[i]["min"], displayDataObj[i]["max"], displayDataObj[i]["median"], displayDataObj[i]["rng"], displayDataObj[i]["mean"], displayDataObj[i]["geomMean"], displayDataObj[i]["harmMean"], displayDataObj[i]["stdev"], displayDataObj[i]["geomStdev"]])
        headers.push(["<b>" + displayDataObj[i]["cohort"].toUpperCase() + "</b>"])
    }

    var tableData = [{
        type: 'table',
        header: {
            values: headers,
            align: "center",
            line: {width: 1, color: 'black'},
            fill: {color: "grey"},
            font: {family: "Arial", size: 12, color: "white"}
        },
        cells: {
            values: values,
            align: "center",
            line: {color: "black", width: 1},
            font: {family: "Arial", size: 11, color: ["black"]}
        }
    }]

    Plotly.newPlot(tablePlot, tableData)
}

function displayViolinPlot() {
    var violinPlot = document.getElementById("plotSpace");

    var violinData = []
    
    for (i=0; i<displayDataObj.length; i++) {
        violinData.push({
            type: 'violin',
            y: displayDataObj[i]["arrayOfValues"],
            box: {
                visible: true
            },
            boxpoints: false,
            opacity: 0.6,
            meanline: {
                visible: true
            },
            x0: displayDataObj[i]['cohort'].toUpperCase()
        })
    }

    var violinLayout= {
        title: displayDataObj[0]['studyID'],
        yaxis: {
            zeroline: false,
            title: "Polygenic Risk Score"
        },
        xaxis: {
            title: "Cohort"
        },
        showlegend: false
    }

    Plotly.newPlot(violinPlot, violinData, violinLayout)
}

function displayBoxPlot() {
    var boxPlot = document.getElementById("plotSpace");

    var data = []
    
    for (i=0; i<displayDataObj.length; i++) {
        data.push({
            y: displayDataObj[i]["arrayOfValues"],
            boxpoints: false,
            type: 'box',
            name: displayDataObj[i]['cohort'].toUpperCase(),
            opacity: 0.6,
        })
    }

    var layout= {
        title: displayDataObj[0]["studyID"],
        yaxis: {
            zeroline: false,
            title: "Polygenic Risk Score"
        },
        xaxis: {
            title: "Cohort"
        },
        showlegend: false
    }

    Plotly.newPlot(boxPlot, data, layout)
}

function displayLinePlot() {
    var linePlot = document.getElementById("plotSpace");
    ranks = [...Array(101).keys()]

    var data = []

    for (i=0; i<displayDataObj.length; i++) {
        data.push({
            x: ranks,
            y: displayDataObj[i]["arrayOfValues"],
            mode: 'lines+markers',
            opacity: 0.6,
            name: displayDataObj[i]['cohort'].toUpperCase()
        })
    }

    var layout= {
        title: displayDataObj[0]['studyID'],
        xaxis: {
            title: "Percentile"
        },
        yaxis: {
            title: "Polygenic Risk Score"
        },
    }

    Plotly.newPlot(linePlot, data, layout)
}

function changePlot() {
    document.getElementById("plotAndTable").style.visibility='visible';

    var plotType = document.querySelector('input[name="plot_type"]:checked').value;
    console.log(plotType)

    switch(plotType) {
        case "Line":
            displayLinePlot()
            break;
        case "Box":
            displayBoxPlot()
            break;
        default:
            displayViolinPlot()
    }
}
