//TODO rename
//TODO make sycronous
function getAllStudies() {
    $.ajax({
        type: "GET",
        url: "/get_all_studies",
        success: async function (data) {
            studyObjects = data;

            //there are multiple studyIDs per publication- to get unique publications,
            //creates a map of unique pubMedIDs -> studyObject, with subsequent studyIDs 
            //being added to the studyObject's studyID list
            pubMedObjs = new Map()
            for (var i = 0; i < studyObjects.length; i++) {
                var newPubMedObj;
                //if the pubMedObjs already has an entry for this studyObject's pubMedID
                if (pubMedObjs.has(studyObjects[i].pubMedID)) {
                    newPubMedObj = Object.assign({}, pubMedObjs.get(studyObjects[i].pubMedID));
                    //if the studyObject's studyID isn't already in the pubMedObj's list, add it
                    if (!newPubMedObj.studyID.includes(studyObjects[i].pubMedID)) {
                        newPubMedObj.studyID.push(studyObjects[i].studyID)
                    }
                    //if the studyObject's trait isn't already in the pubMedObj's list, add it
                    if (!newPubMedObj.trait.includes(studyObjects[i].trait)) {
                        newPubMedObj.trait.push(studyObjects[i].trait)
                    }
                }
                //if the studyObject isn't in the pubMedObj map yet, convert some of its data to lists and add it
                else {
                    newPubMedObj = Object.assign({}, studyObjects[i]);
                    newPubMedObj.studyID = [newPubMedObj.studyID]
                    newPubMedObj.trait = [newPubMedObj.trait]
                }
                //add the new studyObject to the map
                pubMedObjs.set(studyObjects[i].pubMedID, newPubMedObj)
            }
            //sort alphabetically by citation (author name + year)
            newStudyObjects = Array.from(pubMedObjs.values()).sort((a, b) => (a.citation > b.citation) ? 1 : -1);

            //calls the function that adds the data to the website UI
            loadStudies(newStudyObjects)
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loading the studies: ${XMLHttpRequest.responseText}`);
        }
    })
}

//TODO rename
function loadStudies(newStudyObjects) {
    $('#publicationContainer').append(`<h3 style="margin-top: 2rem;">Publications used by the PRS Knowledge Base:</h3>
            <input size="40" type="text" id="studySearchBar" onkeyup="pubSearch()"
            placeholder="Search for disease or article title..."></input>`);

    for (var i = 0; i < newStudyObjects.length; ++i) {
        studyObject = newStudyObjects[i];
        var citation = studyObject.citation;
        var title = studyObject.title;
        var pubMedID = studyObject.pubMedID;
        var studyIDs = studyObject.studyID;
        var traits = studyObject.trait;

        //create the html representing a single publication
        //TODO make searchable by other elements other than citation
        //`<a href="#` + `citation` + `">` + citation + `</a>
        var publicationHTMLString = `<li class="publication" style="list-style:none;"><a href="#` + citation + `">` + citation + `</a> </li>
        <ul>
            <li>Title: `+ title + `</li>
            <li>Traits:`

        //add the traits to the html element
        for (var k = 0; k < traits.length; ++k) {
            //TODO beautify trait names
            trait = traits[k]
            publicationHTMLString += ` ` + trait;
        }

        //add the pub med id to the html element
        publicationHTMLString += `</li><li>PubMed ID: <a href="https://pubmed.ncbi.nlm.nih.gov/` + pubMedID + `/">` + pubMedID + `</a></li>
            <li>Study Accession IDs:`

        //add the study ids to the html element
        for (var k = 0; k < studyIDs.length; ++k) {
            studyID = studyIDs[k]
            publicationHTMLString += `<a href="https://www.ebi.ac.uk/gwas/publications/` + studyID + `/"> ` + studyID + `</a>`;
        }
        publicationHTMLString += `</li></ul>`

        $('#publicationContainer').append(publicationHTMLString);
    }
    $("ul").children('.publication').next('ul').hide();
    $("ul").children('.publication').hide();
    $(".publication").click(function () {
        $(this).next("ul").toggle("slow");
    });
}

function pubSearch() {
    // Declare variables
    var input = document.getElementById('studySearchBar');
    var filter = input.value.toLowerCase();
    var publicationContainer = document.getElementById("publicationContainer");
    var elementList = publicationContainer.getElementsByClassName('publication');

    // Loop through all list items, and hide those who don't match the search query
    for (i = 0; i < elementList.length; i++) {
        var publicationInfoElements = $(elementList[i]).next("ul")
        if (filter == "") {
            publicationInfoElements.hide();
            elementList[i].style.display = "none";
        }
        else {
            var citation = elementList[i].textContent || elementList[i].innerText;
            //gets a list containing the publication info as text (ex: [title, traits, pubMedID, studyIDs])
            var infoTexts = $(publicationInfoElements).find('li').filter(function () {
                return $(this).find('ul').length === 0;
            }).map(function (i, e) {
                var text = $(this).text()
                return text.substring(text.indexOf(":") + 2, text.length).toLowerCase();
            }).get();

            //if the citation or one of the strings in the publication info list (title, trait, 
            //pubMedID, or studyID) contains the search string, the publication element visible, otherwise hide it
            if (citation.toUpperCase().indexOf(filter) > -1 || typeof infoTexts.find(pubInfoString => pubInfoString.includes(filter)) !== "undefined") {
                elementList[i].style.display = "";
            } else {
                publicationInfoElements.hide();
                elementList[i].style.display = "none";
            }
        }
    }
}