function getTraits() {

    //call the API and populate the traits dropdown with the results
    $.ajax({
        type: "GET",
        url: "ukbb_get_traits",
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
        
        $('#study-Selector').replaceWith("<select id='study-Selector' style='margin-top: 2em; margin-bottom: 2em;' disabled> <option selected='selected' value='default'>Select a Study</option> </select>");
        var studySelector = document.getElementById("study-Selector");
        
        $.ajax({
            type: "GET",
            url: "/ukbb_get_studies",
            data: { trait: trait, studyTypes: studyTypes },
            success: async function (studyLists) {

                if (studyLists.length == 0) {
                    alert(`No results were found using the specified filters. Try using different filters.`)
                }

                for (i = 0; i < studyLists.length; i++) {
                    studyObj = studyLists[i]
                    var trait = studyObj.trait
                    var studyID = studyObj.studyID
                    var displayString = studyObj.citation + " | " + studyID //trait + " | " +  <-- putting that code at the front would make it match the calculation page

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
            }
        })

        studySelector.disabled = false;
    }
}

function displayGraphs() {
    var studySelector = document.getElementById("study-Selector");
    selectedStudy = studySelector.options[studySelector.selectedIndex]
    studyID = studySelector.value;
    trait = selectedStudy.getAttribute("data-trait")

    $.ajax({
        type: "GET",
        url: "/ukbb_full_results",
        data: { trait: trait, studyID: studyID },
        success: async function (data) {

            if (data.length == 0) {
                alert(`There was an error retrieving the data to display`)
            }
            else {
                //update the header name of the study
                var studyName = document.getElementById("studyName")
                studyName.innerText = selectedStudy.getAttribute("data-citation");
                studyName.hidden = false;
                var violinPlot = document.getElementById("violinPlot");
                var tablePlot = document.getElementById("tablePlot");

                const keys = Object.keys(data[0]);
                arrayOfValues = []

                // iterate over keys and create datapoints
                keys.forEach((key, index) => {
                    if (/^p[0-9]{1,3}$/.test(key)) {
                        arrayOfValues.push(data[0][key])
                    }
                });

                var violinData = [{
                    type: 'violin',
                    y: arrayOfValues,
                    box: {
                        visible: true
                    },
                    boxpoints: false,
                    line: {
                        color: 'black'
                    },
                    fillcolor: '#8dd3c7',
                    meanline: {
                        visible: true
                    },
                    x0: studyID
                }]

                var violinLayout= {
                    title: "",
                    yaxis: {
                        zeroline: false
                    }
                }

                Plotly.newPlot(violinPlot, violinData, violinLayout)

                var values = [
                    ['Salaries', 'Office', 'Merchandise', 'Legal', '<b>TOTAL</b>'],
                    [1200000, 20000, 80000, 2000, 12120000],
                    [1300000, 20000, 70000, 2000, 130902000],
                    [1300000, 20000, 120000, 2000, 131222000],
                    [1400000, 20000, 90000, 2000, 14102000]]

                var tableData = [{
                    type: 'table',
                    header: {
                        values: [["<b>EXPENSES</b>"], ["<b>Q1</b>"],
                            ["<b>Q2</b>"], ["<b>Q3</b>"], ["<b>Q4</b>"]],
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
                var studyMetadata = document.getElementById("studymetadata")
                metadatastring = `<p><b>Title:</b> ${selectedStudy.getAttribute("data-title")}</p><p><b>Citation:</b> ${selectedStudy.getAttribute("data-citation")}</p><p><b>Trait:</b> ${selectedStudy.getAttribute("data-trait")}</p><p><b>Reported Trait:</b> ${selectedStudy.getAttribute("data-reported-trait")}</p><p><b>Pubmed ID:</b> ${selectedStudy.getAttribute("data-pubmedid")}</p><p><b>Altmetric Score:</b> ${selectedStudy.getAttribute("data-altmetric-score")}</p><br>`
                studyMetadata.innerHTML = metadatastring
            }
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies`);
        }
    })

}