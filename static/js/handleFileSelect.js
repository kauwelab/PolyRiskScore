//Outputs some file information when the user selects a file. 
function handleFileSelect(evt) {
    var f = evt.target.files[0]; // FileList object
    var output = [];
    //sessionStorage.removeItem("riskResults");

    resetOutput();

    $('#response').html("");

    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
        f.size, ' bytes, last modified: ',
        f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
        '</li>');
    var vcfText = "";
    printFileEnds(f, 2048);
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
            //forEachLine(results); // This is from lines.pop(), before.
            onComplete(); // Done
            return;
        }
        var slice = file.slice(offset, offset + CHUNK_SIZE);
        fr.readAsArrayBuffer(slice);
    }
}

/**
 * Prints the beginning and the end of the file specified with elipses in the middle. Each half of the file is half of sizeToPrint.
 * @param {*} file the file from which to print its beginning and end
 * @param {*} sizeToPrint the combined size in bites of the beginning and end to print
 */
function printFileEnds(file, sizeToPrint) {
    var CHUNK_SIZE = sizeToPrint / 2;
    var fr = new FileReader();
    var state = 0;
    var output = "";
    fr.onload = function () {
        //for small files, the elispses are not included and the end chunk reading is skipped
        if (CHUNK_SIZE * 2 >= file.size) {
            output += fr.result;
            ++state;
        }
        else {
            output += fr.result
            if (state == 0) {
                output += "\n...\n"
            }
        }
        ++state;
        seek();
    }
    fr.onerror = function () {
        // Cannot read file... 
        $('#input').html("There was an error reading the file.");
    };
    seek();
    function seek() {
        //read the first chunk
        if (state == 0) {
            //if the CHUNK_SIZE * 2 is greater than the file size, read the entire file and skip to the printing state
            if (CHUNK_SIZE * 2 >= file.size) {
                fr.readAsText(file.slice(0, file.size));
            }
            else {
                fr.readAsText(file.slice(0, CHUNK_SIZE));
            }
        }
        //read the last chunk
        else if (state == 1) {
            fr.readAsText(file.slice(file.size - CHUNK_SIZE, file.size));
        }
        //print both chunks
        else {
            document.getElementById('input').value = output;
            return;
        }
    }
}

var readFile = async (vcfFile) => {
    var reader = new Response(vcfFile);
    fileContents = await reader.text();
    return fileContents;
}
