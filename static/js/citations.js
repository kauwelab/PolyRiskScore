//TODO rename
function getAllStudies() {
    $.ajax({
        type: "GET",
        url: "/get_all_studies",
        success: async function (data) {
            studyObjects = data;

            pubmedObjs = new Map()
            for (var i = 0; i < studyObjects.length; i++) {
                var newPubMedObj;
                if (pubmedObjs.has(studyObjects[i].pubmedID)) {
                    newPubMedObj = Object.assign({}, pubmedObjs.get(studyObjects[i].pubmedID));
                    newPubMedObj.studyID.push(studyObjects[i].studyID)
                }
                else {
                    newPubMedObj = Object.assign({}, studyObjects[i]);
                    newPubMedObj.studyID = [newPubMedObj.studyID]
                }
                pubmedObjs.set(studyObjects[i].pubmedID, newPubMedObj)
            }

            loadStudies(pubmedObjs)
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies: ${XMLHttpRequest.responseText}`);
        }
    })
}

//TODO rename
function loadStudies(pubMedObjs) {
    $('#publicationContainer').append(`<h3 style="margin-top: 2rem;">Publications used by the PRS Knowledge Base:</h3>
            <input size="40" type="text" id="studySearchBar" onkeyup="pubSearch()"
            placeholder="Search for disease or article title..."></input>`);


    var pubMedIDs = Object.keys(pubMedObjs);
    pubMedIDs.sort();
    for (var i = 0; i < pubMedIDs.length; ++i) {
        studyObject = pubMedObjs.get(pubMedIDs[i])
        var citation = studyObject.citation;
        var title = studyObject.title;
        var pubMedID = studyObject.pubMedID;
        var studyID = studyObject.studyID;

        var publicationHTMLString = `<li class="publication">` + citation + `</li>
        <ul>
            <li>Title: `+ title + `</li>
            <li>PubMed ID: <a href="https://pubmed.ncbi.nlm.nih.gov/`+ pubMedID + `/">` + pubMedID + `</a></li>
            <li>Study Accession IDs: <a href="https://www.ebi.ac.uk/gwas/publications/`+ pubMedID + `/">` + pubMedID + `</a></li>
        </ul>`

        $('#publicationContainer').append(publicationHTMLString);
    }
    $("ul").children('.publication').next('ul').hide();
    $("ul").children('.publication').hide();
    $(".publication").click(function () {
        $(this).next("ul").toggle("slow");
    });
    //$("#cite1Container").hide();

    // $('#publicationContainer').append(`<li class="publication" style="display: none;"><a data-toggle="collapse" href="#cite2">D</a></li>
    //     <ul id="cite2" class="collapse">
    //         <li>E</li>
    //         <li><a
    //             href="https://www.bountysource.com/issues/76999512-connectionerror-connection-lost-write-econnreset-when-inserting-long-string">F</a></li>
    //     </ul>`);
    //TODO 
    //get all studies on load
    //format data recieved
    // get

    //TODO can the search bar access all parts of each element, including drop downs?
    // processedPubMedIDs = new Set()
    // for (var i = 0; i < studyObjects.length; i++) {

    //     studyObject = studyObjects[i]
    //     var citation = studyObject.citation;
    //     var title = "test";
    //     var pubmedID = studyObject.pubMedID;
    //     var accessionListName = "#accessionList" + pubmedID
    //     if (processedPubMedIDs.has(pubmedID)) {
    //         //$(accessionListName).append(`<li">Study Accession IDs: <a href="https://www.ebi.ac.uk/gwas/publications/`+ pubmedID +`/">`+ pubmedID +`</a></li>`)
    //     }
    //     else {
    //         //TODO put an id on the study acessions so that more can be added
    //         $('#publicationContainer').append(`<li class="article"><a data-toggle="collapse" href="#`+citation+`">`+citation+`</a></li>
    //         <ul id="`+citation+`" class="collapse">
    //           <li>Title: `+ title +`</li>
    //           <li>PubMed ID: <a href="https://pubmed.ncbi.nlm.nih.gov/`+ pubmedID +`/">`+ pubmedID +`</a></li>
    //           <li>Study Accession IDs: <a href="https://www.ebi.ac.uk/gwas/publications/`+ pubmedID +`/">`+ pubmedID +`</a></li>
    //         </ul>`);
    //     }
    //     processedPubMedIDs.add(pubmedID)


    //     //var studyIDs = 
    // }

    // outside container
    //     article container

}

function pubSearch() {
    // Declare variables
    var input = document.getElementById('studySearchBar');
    var filter = input.value.toUpperCase();
    var publicationContainer = document.getElementById("publicationContainer");
    var elementList = publicationContainer.getElementsByClassName('publication');

    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < elementList.length; i++) {
        if (filter == "") {
            $(elementList[i]).children().children().css({ "color": "red", "border": "2px solid red" });
            //$(elementList[i]).children().toggle("slow")
            $(elementList[i]).next("ul").hide();
            elementList[i].style.display = "none";
        }
        else {
            txtValue = elementList[i].textContent || elementList[i].innerText;
            if (txtValue.toUpperCase().indexOf(filter) > -1) {
                elementList[i].style.display = "";
            } else {
                $(elementList[i]).children().children().css({ "color": "red", "border": "2px solid red" });
                $(elementList[i]).next("ul").hide();
                elementList[i].style.display = "none";
            }
        }
    }
}