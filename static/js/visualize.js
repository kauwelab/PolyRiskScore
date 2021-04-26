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

    // enable children that have the correct cohorts
    $.ajax({
        type: "GET",
        url: "cohort_get_cohorts",
        data: { trait: trait, studyID: studyID },
        success: async function (data) {
            cohortList = data;
            // ensure the correct cohort options are available
            for (i = 0; i < cohortSelectorList.length; i++) {
                if (cohortSelectorList[i].value != "default") {
                    if (cohortList.includes(cohortSelectorList[i].value)) {
                        cohortSelectorList[i].disabled = false
                    }
                    else {
                        cohortSelectorList[i].disabled = true
                    }
                }
            }
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
    cohortSelector.value = 'default';
    cohortSelector.disabled = true;
}

function displayGraphs() {
    var studySelector = document.getElementById("study-Selector");
    selectedStudy = studySelector.options[studySelector.selectedIndex]
    studyID = studySelector.value;
    trait = selectedStudy.getAttribute("data-trait")

    var cohortSelector = document.getElementById("cohort-Selector");
    cohort = cohortSelector.value;

    $.ajax({
        type: "GET",
        url: "/cohort_full_results",
        data: { trait: trait, studyID: studyID, cohort: cohort },
        success: async function (data) {

            if (data.length == 0) {
                alert(`There was an error retrieving the data to display`)
            }
            else {
                //update the header name of the study
                var studyName = document.getElementById("studyName")
                studyName.innerText = selectedStudy.getAttribute("data-citation");
                studyName.hidden = false;
                displayDataObj = data[0]

                const keys = Object.keys(displayDataObj);
                arrayOfValues = []

                // iterate over keys and create datapoints
                keys.forEach((key, index) => {
                    if (/^p[0-9]{1,3}$/.test(key)) {
                        arrayOfValues.push(data[0][key])
                    }
                });

                displayDataObj["arrayOfValues"] = arrayOfValues

                changePlot()
                displayTable()

                var studyMetadata = document.getElementById("studymetadata")
                metadatastring = `<p><b>Title:</b> ${selectedStudy.getAttribute("data-title")}</p>
                <p><b>Citation:</b> ${selectedStudy.getAttribute("data-citation")}</p>
                <p><b>Trait:</b> ${selectedStudy.getAttribute("data-trait")}</p>
                <p><b>Reported Trait:</b> ${selectedStudy.getAttribute("data-reported-trait")}</p>
                <p><b>Pubmed ID:</b> ${selectedStudy.getAttribute("data-pubmedid")}</p>
                <p><b>Altmetric Score:</b> ${selectedStudy.getAttribute("data-altmetric-score")}</p>
                <p><b>Cohort SNPs Used:</b> ${displayDataObj["snps"].join(", ")}<br>`
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
        [displayDataObj["min"], displayDataObj["max"], displayDataObj["median"], displayDataObj["rng"], displayDataObj["mean"], displayDataObj["geomMean"], displayDataObj["harmMean"], displayDataObj["stdev"], displayDataObj["geomStdev"]]
    ]

    var tableData = [{
        type: 'table',
        header: {
            values: [["<b>Summary Values</b>"], ["<b>" + displayDataObj["studyID"] + "</b>"]],
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

    var violinData = [{
        type: 'violin',
        y: displayDataObj["arrayOfValues"],
        box: {
            visible: true
        },
        boxpoints: false,
        opacity: 0.6,
        line: {
            color: 'black'
        },
        fillcolor: 'rgba(141, 211, 199, 1)',
        meanline: {
            visible: true
        },
        x0: displayDataObj['studyID']
    }]

    var violinLayout= {
        title: "",
        yaxis: {
            zeroline: false,
            title: "Polygenic Risk Score"
        }
    }

    Plotly.newPlot(violinPlot, violinData, violinLayout)
}

function displayBoxPlot() {
    var boxPlot = document.getElementById("plotSpace");

    var data = [
        {
            y: displayDataObj["arrayOfValues"],
            boxpoints: false,
            type: 'box',
            name: displayDataObj['studyID'],
            opacity: 0.6,
            line: {
                color: 'black'
            },
            fillcolor: 'rgba(141, 211, 199, 1)'
        }
    ];

    var layout= {
        title: "",
        yaxis: {
            zeroline: false,
            title: "Polygenic Risk Score"
        }
    }

    Plotly.newPlot(boxPlot, data, layout)
}

function displayLinePlot() {
    var linePlot = document.getElementById("plotSpace");
    ranks = [...Array(101).keys()]

    var data = [{
        x: ranks,
        y: displayDataObj["arrayOfValues"],
        mode: 'lines+markers',
        line: {
            color: 'rgba(141, 211, 199, 0.6)'
        },
        marker: {
            color: 'rgba(141, 211, 199, 1)',
            size: 3
        },
        name: displayDataObj['studyID']
    }]

    var layout= {
        title: displayDataObj['studyID'],
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
