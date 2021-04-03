
function getStudyLinks() {
debugger;
    $.get("/get_studies",
    function (data, status) {
    
    var studiesString = ""
    studiesArray = data
    debugger;
    for (var i = 0; i < studiesArray.length; i++) {
        /*studiesString  += "<li><a href=\"" + studiesArray[i].URL + "\"> \n"
            + studiesArray[i].reference + "</a></li> \n";*/
        studiesString +=  "<li class=\"article\"><a data-toggle=\"collapse\" href=\"#cite"+ (i + 1) + "\">" + studiesArray[i].reference + "</a></li>\n"
             + "<ul id=\"cite" + (i + 1) + "\" class=\"collapse\">\n"
             + "<li>" + studiesArray[i].articleName + "</li>\n"
             + "<li><a href=\"" + studiesArray[i].URL + "\">Click here for article</a></li>\n"
             + "</ul>\n"

            /* <li class="article"><a data-toggle="collapse" href="#cite3">Schizophrenia: gwas</a></li>
            <ul id="cite3" class="collapse">
                <li>Example Citation 3</li>
              </ul>*/
              //<li class="article"><a data-toggle="collapse" href="https://www.bountysource.com/issues/76999512-connectionerror-connection-lost-write-econnreset-when-inserting-long-string">number 1</a></li>↵	<ul id="cite1" class="collapse">↵<li>john</li>↵</ul>↵<li class="article"><a data-toggle="collapse" href="https://www.google.com/search?q=object.pluralize&rlz=1C1XYJR_enUS815US815&oq=object.pluralize&aqs=chrome..69i57.4710j0j7&sourceid=chrome&ie=UTF-8">number 2</a></li>↵	<ul id="cite2" class="collapse">↵<li>jacob</li>↵</ul>↵" 
    }
    document.getElementById('publications').innerHTML = studiesString

    /*debugger    
    var studiesArray = JSON.parse(data)
    var studiesObjects = []
    for (var i = 0; i < studiesArray.length(); i++) {
        studiesObjects.push(JSON.parse(studiesArray[i]))
    }

    var studiesString = ""

    for (var i = 0; i < studiesObjects.length(); i++) {
        studiesString  += "<li><a href=\"" + studiesObjects[i].URL + "\"> \n"
            + studiesObjects[i].reference + "</a></li> \n";
    }

    document.getElementById('publications').innerHTML = studiesString;
*/
    })
}

function changeList() {
    var tempString = "<li><a href=\"https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML\"> this is what the list item should say</a></li>";
    document.getElementById('publications').innerHTML = tempString;
}
