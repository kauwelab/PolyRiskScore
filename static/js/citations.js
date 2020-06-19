//ajax is asyncronous so it must call the loadStudies function on success
function getOrderedPublicationsAndLoad() {
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
                studyObjects[i].trait = formatHelper.formatForWebsite(studyObjects[i].trait)

                //if the pubMedObjs already has an entry for this studyObject's pubMedID
                if (pubMedObjs.has(studyObjects[i].pubMedID)) {
                    //gets the object address of the pubMedObj inside pubMedObjs for direct editing
                    //(doesn't need to be appended to the map)
                    var pubMedObj = pubMedObjs.get(studyObjects[i].pubMedID);
                    //if the studyObject's studyID isn't already in the pubMedObj's list, add it
                    if (!pubMedObj.studyID.includes(studyObjects[i].studyID)) {
                        pubMedObj.studyID.push(studyObjects[i].studyID)
                    }
                    //if the studyObject's trait isn't already in the pubMedObj's list, add it
                    if (!pubMedObj.trait.includes(studyObjects[i].trait)) {
                        pubMedObj.trait.push(studyObjects[i].trait)
                    }
                }
                //if the studyObject isn't in the pubMedObj map yet, convert some of its data to lists and add it
                else {
                    //copies the studyObject into a new variable to edit it's values
                    var newPubMedObj = Object.assign({}, studyObjects[i]);
                    newPubMedObj.studyID = [newPubMedObj.studyID]
                    newPubMedObj.trait = [newPubMedObj.trait]
                    //add the new studyObject to the map
                    pubMedObjs.set(studyObjects[i].pubMedID, newPubMedObj)
                }
            }
            //sort alphabetically by citation (author name + year)
            newStudyObjects = Array.from(pubMedObjs.values()).sort((a, b) => (a.citation > b.citation) ? 1 : -1);

            //calls the function that adds the data to the website UI
            loadStudies(newStudyObjects)
        },
        error: function (XMLHttpRequest) {
            alert(`There was an error loadfing the studies: ${XMLHttpRequest.responseText}`);
        }
    })
}

//takes a list of study objects and converts them into invisible html elements
//for each publication, two elements are created, one for the citation, and a list
//element that becomes visible and expands when the citation element is clicked
//the citation tha
function loadStudies(newStudyObjects) {
    //create the html representing each publication
    for (var i = 0; i < newStudyObjects.length; ++i) {
        studyObject = newStudyObjects[i];
        var citation = studyObject.citation;
        var title = studyObject.title;
        var pubMedID = studyObject.pubMedID;
        var studyIDs = studyObject.studyID;
        var traits = studyObject.trait;

        //add the citation element and add the title and first trait to the publication info list element
        var publicationHTMLString = `<li class="publication" style="list-style:none;"><a href="#` + citation + `">` + citation + `</a> </li>
        <ul>
            <li>Title: ` + title + `</li>
            <li>Traits: ` + traits[0]

        //if there are more than on trait for this publication, add them too with commas separating each trait
        if (traits.length > 1) {
            for (var k = 1; k < traits.length; ++k) {
                trait = traits[k]
                publicationHTMLString += `, ` + trait;
            }
        }

        //add the pub med id to the html element
        publicationHTMLString += `</li><li>PubMed ID: <a href="https://pubmed.ncbi.nlm.nih.gov/` + pubMedID + `/" target="_blank">` + pubMedID + `</a></li>
            <li>Study Accession IDs:`

        //add the study ids to the html element
        for (var k = 0; k < studyIDs.length; ++k) {
            studyID = studyIDs[k]
            publicationHTMLString += `<a href="https://www.ebi.ac.uk/gwas/studies/` + studyID + `/" target="_blank"> ` + studyID + `</a>`;
        }
        publicationHTMLString += `</li></ul>`

        $('#publicationContainer').append(publicationHTMLString);
    }
    //hide the study information list element and give the publication a click expand function
    $("ul").children('.publication').next('ul').hide();
    $("ul").children('.publication').hide();
    $(".publication").click(function () {
        $(this).next("ul").toggle("slow");
    });
}

//gets the filter string from the search bar- if it matches any part of the citation or publication information,
//that publication becomes visible, otherwise the publication is set to display: none 
function searchPublications() {
    var input = document.getElementById('studySearchBar');
    var filter = input.value.toLowerCase();
    var publicationContainer = document.getElementById("publicationContainer");
    var elementList = publicationContainer.getElementsByClassName('publication');

    //loop through all list items, and hide those that don't match the search query
    for (i = 0; i < elementList.length; i++) {
        //the list element containing the publication's info
        var publicationInfoElements = $(elementList[i]).next("ul")
        //if the search bar is empty, hide all publication elements
        if (filter == "") {
            publicationInfoElements.hide();
            elementList[i].style.display = "none";
        }
        else {
            var citation = elementList[i].textContent || elementList[i].innerText;
            //gets a string list containing the publication info (ex: [title, traits, pubMedID, studyIDs])
            var infoTexts = $(publicationInfoElements).find('li').filter(function () {
                return $(this).find('ul').length === 0;
            }).map(function (i, e) {
                var text = $(this).text()
                return text.substring(text.indexOf(":") + 2, text.length).toLowerCase();
            }).get();

            //if the citation or one of the strings in the publication info list (title, trait, 
            //pubMedID, or studyID) contains the search string, make the publication element visible, otherwise hide it
            if (citation.toLowerCase().indexOf(filter) > -1 || typeof infoTexts.find(pubInfoString => pubInfoString.includes(filter)) !== "undefined") {
                elementList[i].style.display = "";
            } else {
                publicationInfoElements.hide();
                elementList[i].style.display = "none";
            }
        }
    }
}