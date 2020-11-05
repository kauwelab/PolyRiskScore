function getTraits() {

    //call the API and populate the traits dropdown with the results
    $.ajax({
        type: "GET",
        url: "get_traits",
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
        trait = [traitSelector.value]
        studyTypes = [studyTypeSelector.value]
        if (studyTypeSelector.value == "ALL"){
            studyTypes = ["HI", "LC", "O"]
        }
        
        $('#study-Selector').replaceWith("<select id='study-Selector' style='margin-top: 2em; margin-bottom: 2em;' disabled> <option selected='selected' value='default'>Select a Study</option> </select>");
        var studySelector = document.getElementById("study-Selector");
        
        $.ajax({
            type: "POST",
            url: "/get_studies",
            data: { traits: trait, studyTypes: studyTypes },
            success: async function (data) {
                var studyLists = data;
                var traits = Object.keys(data);

                if (traits.length == 0) {
                    alert(`No results were found using the specified filters. Try using different filters.`)
                }

                for (i = 0; i < traits.length; i++) {
                    var trait = traits[i];
                    for (j = 0; j < studyLists[trait].length; j++) {
                        var study = studyLists[trait][j];
                        var opt = document.createElement('option');
                        var displayString = study.citation + ' | ' + study.studyID;
                        opt.appendChild(document.createTextNode(formatHelper.formatForWebsite(displayString)));
                        opt.value = study.studyID;
                        opt.setAttribute('data-altmetric-score', study.altmetricScore);
                        opt.setAttribute('data-citation', study.citation);
                        opt.setAttribute('data-title', study.title);
                        opt.setAttribute('data-pubmedid', study.pubMedID);
                        studySelector.appendChild(opt);
                    }
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
    studyID = studySelector.value;

    //update the header name of the study
    var studyName = document.getElementById("studyName")
    selectedStudy = studySelector.options[studySelector.selectedIndex]
    studyName.innerText = selectedStudy.getAttribute("data-citation");
    studyName.hidden = false;
    var violinPlot = document.getElementById("violinPlot");
    var tablePlot = document.getElementById("tablePlot");

    // add code to hook up with the ukbb endpoints

    var violinData = [{
        type: 'violin',
        y: [3,5,7,3,5,7,8,2,4,5,7,8,4,8,8,8,2,2,2,30],
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
        }
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
    metadatastring = `<p><b>Title:</b> ${selectedStudy.getAttribute("data-title")}</p><p><b>Citation:</b> ${selectedStudy.getAttribute("data-citation")}</p><p><b>Pubmed ID:</b> ${selectedStudy.getAttribute("data-pubmedid")}</p><p><b>Altmetric Score:</b> ${selectedStudy.getAttribute("data-altmetric-score")}</p><br>`
    studyMetadata.innerHTML = metadatastring
}