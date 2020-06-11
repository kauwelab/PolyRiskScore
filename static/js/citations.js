const e = require("express");

function revealCite() {
    console.loge('in here')
}

//TODO rename
function getAllStudies() {
    $.ajax({
        type: "GET",
        url: "/get_all_studies",
        success: async function (data) {
            studyObjects = data;
            loadStudies(studyObjects)
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies: ${XMLHttpRequest.responseText}`);
        }
    })
}

//TODO rename
function loadStudies(studyObjects) {
    //TODO 
    //get all studies on load
    //format data recieved
        // get

    // pubmedObjs = new Map()
    // for (var i = 0; i < studyObjects.length; i++) { 
    //     if (pubmedObjs.has(studyObjects[i].pubmedID)) {
    //         var newPubMedObj = pubmedObjs.get(studyObjects[i].pubmedID)
    //         newPubMedObj.
    //         pubmedObjs.set(studyObjects[i].pubmedID, pubmedObjs.getstudyObjects[i])
    //     }
    //     else {
    //         pubmedObjs.set(studyObjects[i].pubmedID, [studyObjects[i]])
    //     }
    // }

    //TODO can the search bar access all parts of each element, including drop downs?
    processedPubMedIDs = new Set()
    for (var i = 0; i < studyObjects.length; i++) {

        studyObject = studyObjects[i]
        var citation = studyObject.citation;
        var title = "test";
        var pubmedID = studyObject.pubMedID;
        if (processedPubMedIDs.has(pubmedID)) {
            //TODO append the studyID to the correct element
        }
        else {
            //TODO put an id on the study acessions so that more can be added
            $('#publicationContainer').append(`<li class="article"><a data-toggle="collapse" href="#`+citation+`">`+citation+`</a></li>
            <ul id="`+citation+`" class="collapse">
              <li>Title: `+ title +`</li>
              <li>PubMed ID: <a href="https://pubmed.ncbi.nlm.nih.gov/`+ pubmedID +`/">`+ pubmedID +`</a></li>
              <li>Study accession IDs: <a href="https://www.ebi.ac.uk/gwas/publications/`+ pubmedID +`/">`+ pubmedID +`</a></li>
            </ul>`);
        }


        //var studyIDs = 
    }

    // outside container
    //     article container

}