//Outputs some file information when the user selects a file. 
function handleFileSelect(evt) {
    var f = evt.target.files[0]; // FileList object
    var output = [];
    sessionStorage.removeItem("riskResults");
    $('#response').html("");

    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
        f.size, ' bytes, last modified: ',
        f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
        '</li>');
    var vcfText = "";
    //TODO make number of lines configurable or make output size based instead of line based 
    readSomeLines(f, 10, function (line) {
        vcfText += line;
    }, function onComplete() {
        $('#input').html(vcfText);
    });
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}

/**
 * Found here: https://stackoverflow.com/questions/39479090/read-n-lines-of-a-big-text-file
 * Read up to and including |maxlines| lines from |file|.
 *
 * @param {Blob} file - The file to be read.
 * @param {integer} maxlines - The maximum number of lines to read.
 * @param {function(string)} forEachLine - Called for each line.
 * @param {function(error)} onComplete - Called when the end of the file
 *     is reached or when |maxlines| lines have been read.
 */
function readSomeLines(file, maxlines, forEachLine, onComplete) {
    var CHUNK_SIZE = 50000; // 50kb, arbitrarily chosen.
    var decoder = new TextDecoder();
    var offset = 0;
    var linecount = 0;
    var linenumber = 0;
    var results = '';
    var fr = new FileReader();
    fr.onload = function () {
        // Use stream:true in case we cut the file
        // in the middle of a multi-byte character
        results += decoder.decode(fr.result, { stream: true });
        var lines = results.split('\n');
        results = lines.pop(); // In case the line did not end yet.
        linecount += lines.length;

        if (linecount > maxlines) {
            // Read too many lines? Truncate the results.
            lines.length -= linecount - maxlines;
            linecount = maxlines;
        }

        for (var i = 0; i < lines.length; ++i) {
            forEachLine(lines[i] + '\n');
        }
        offset += CHUNK_SIZE;
        seek();
    };
    fr.onerror = function () {
        onComplete(fr.error);
    };
    seek();

    function seek() {
        if (linecount === maxlines) {
            // We found enough lines.
            onComplete(); // Done.
            return;
        }
        if (offset !== 0 && offset >= file.size) {
            // We did not find all lines, but there are no more lines.
            forEachLine(results); // This is from lines.pop(), before.
            onComplete(); // Done
            return;
        }
        var slice = file.slice(offset, offset + CHUNK_SIZE);
        fr.readAsArrayBuffer(slice);
    }
}

// function readFile(){
//     var vcfFile = document.getElementById("files").files[0]; 
//     //Initialize Map object
//     var vcfParser = new VCFParser(); 
    
//     return readLineByLine(vcfFile, function callback(contents){
//         if (!contents){ //Change this to throw an error later.
//             console.log("ERROR OCCURED");
//         }
//         else{
//             //console.log(contents); 
//             try{
//                 vcfParser.parseStream(contents, "vcf"); 
//             }
//             catch(err){
//                 $('#response').html(err);
//                 return; 
//             }
//             if (arguments[1]){
//                 console.log(vcfParser.getMap()); 
//                 return vcfParser.getMap();
//             }
//         }
//         //console.log(vcfParser.getMap()); 
//         //Add map value returned from vcf_parser onto Map object
//     });   
//     console.log(vcfParser.getMap()); 
//     //console.log("At last..."); 
//     //x console.log(vcfParser.getMap()); 
//     //How to return the map object...???
// }

// function readLineByLine(file, callback) {
//     //Should read the lines into an array. 
//     var lag_line = ""; 
//     var CHUNK_SIZE = 124; // 1 KB at a time.
//     var offset = 0;
//     var fr = new FileReader();
//     fr.onload = function() {
//         //console.log(fr.result); 
//         var output = fr.result.split("\n"); 
//         //If the last line is incomplete, save it until you read in the next chunk.
//         //Then add that line to the beginning of the next chunk. 
//         output[0] = lag_line + output[0]; 
//         lag_line = output.pop(); 
//         callback(output); 
//         offset += CHUNK_SIZE;
//         seek();
//         //return here?
//     };
//     fr.onerror = function() {
//         // Cannot read file... 
//         callback(0);
//     };
//     seek();

//     function seek() {
//         if (offset >= file.size) { //We've reached the end of the file.
//             //console.log(lag_line); 
//             //if(lag_line){
//             //return map here
//             callback(lag_line.split("\n"), 1); 
//             //} //???
//             //return;
//         }
//         var slice = file.slice(offset, offset + CHUNK_SIZE); //Take the next slice.
//         fr.readAsText(slice);
//     }
// }

// function populateMap(){
//     var vcfParser = new VCFParser(); 
//     var lag_line = ""; 
//     var CHUNK_SIZE = 124; // 1 KB at a time.
//     var offset = 0;
//     var fr = new FileReader();
//     fr.onload = function() {
//         var output = fr.result.split("\n"); 
//         //If the last line is incomplete, save it until you read in the next chunk.
//         //Then add that line to the beginning of the next chunk. 
//         output[0] = lag_line + output[0]; 
//         lag_line = output.pop(); 
//         callback(output); 
//         offset += CHUNK_SIZE;
//         seek();
//     };
//     fr.onerror = function() {
//         callback(0);
//     };
//     seek();

//     function seek() {
//         if (offset >= file.size) { //We've reached the end of the file.
//             //return map here
//             callback(lag_line.split("\n"), 1); 
//         }
//         var slice = file.slice(offset, offset + CHUNK_SIZE); //Take the next slice.
//         fr.readAsText(slice);
//     }
// }

var readFile = async () => {

    var vcfFile = document.getElementById("files").files[0];
    var reader = new Response(vcfFile);
    fileContents = await reader.text();
    return fileContents;
}
