//Constructor
function VCFParser() {
  this.numSamples = 0;
  this.sampleIndex = {}
  this.vcfAttrib = {}
  this.vcfMap = new Map();
}

VCFParser.prototype.getMap = function () {
  return this.vcfMap;
}

//populate map function here
VCFParser.prototype.populateMap = function (file, extension) {
  var vcfParser = this;
  var lag_line = "";
  var CHUNK_SIZE = 1024; // 1 KB at a time.
  var offset = 0;
  var fr = new FileReader();
  return new Promise((resolve, reject) => {
    fr.onload = function () {
      var output = fr.result.split("\n");
      //If the last line is incomplete, save it until you read in the next chunk.
      //Then add that line to the beginning of the next chunk. 
      output[0] = lag_line + output[0];
      lag_line = output.pop();
      //callback(output); 
      try {
        vcfParser.parseStream(output, extension);
      }
      catch (err) {
        $('#response').html(err);
        return;
      }
      //console.log(output); 
      offset += CHUNK_SIZE;
      return seek();
    };
    fr.onerror = function () {
      callback(0);
    };
    seek();
    function seek() {
      if (offset >= file.size) { //We've reached the end of the file.
        //return map here
        if (lag_line) {
          try {
            vcfParser.parseStream(lag_line.split("\n"), "vcf");
          }
          catch (err) {
            $('#response').html(err);
            return;
          }
        }
        resolve(vcfParser.getMap());
        return;
        //callback(lag_line.split("\n"), 1); 
      }
      var slice = file.slice(offset, offset + CHUNK_SIZE); //Take the next slice.
      fr.readAsText(slice);
    }
  });

}

VCFParser.prototype.parseStream = function (instream, extension) {
  //var vcfMapMaps = new Map();
  //var numSamples = 0;
  //var sampleIndex = {}
  //var vcfAttrib = {}
  //var outstream = new Stream()
  var rl = manageByExtension(extension, instream);
  var that = this;
  rl.forEach(function (line, index) {
    // check if line starts with hash and use them
    if (line.indexOf('#') === 0) {
      // #CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample1\tsample2\tsample3
      // set number of samples in vcf file
      if (line.match(/^#CHROM/)) {
        var sampleinfo = line.split('\t')
        that.numSamples = sampleinfo.length - 9

        for (var i = 0; i < that.numSamples; i++) {
          that.sampleIndex[i] = sampleinfo[9 + i]
        }
      }
      else {
        that.vcfAttrib = defineVCFAttributes(that.vcfAttrib, line); //Test to make sure this works!!
      }
    } else { // go through remaining lines
      // split line by tab character
      var info = line.split('\t')
      if (info.length < 9) {
        //Throw an error if vcfMapMaps is empty.
        //This probably means the user uploaded an empty file or a file in the wrong format. 
        if (that.vcfMap === undefined) {
          throw "An error occurred while parsing the file. Please make sure you uploaded the correct file."
        }
        else if (that.vcfMap.size === 0) {
          throw "An error occurred while parsing the file. Please make sure you uploaded the correct file."
        }
        return; //I'm assuming this will be for files that have a blank line or two at the end???
      }
      //make sampleObject
      var sampleObject = parseSampleInfo(that.numSamples, that.sampleIndex, info);
      // parse the variant call information
      var varInfo = info[7].split(';')
      // parse the variant information
      var infoObject = parseVariantData(varInfo, info);
      var vcfLine = createVariantData(info, infoObject, sampleObject, that.vcfAttrib);
      that.vcfMap = sharedCode.addLineToVcfObj(that.vcfMap, vcfLine)//createMap(that.vcfMap, varData); //Find a better name than vcfMapMaps!
    }
  });
  //After we've gone through every line, we should end up here?
  //console.log("How'd I end up here?"); 
  //return this.vcfMap; //To Delete
}

function manageByExtension(extension, instream) {
  var rl

  switch (extension) {
    //  Figure out how to handle gz and zip
    case 'vcf':
      rl = instream;
      break
    default:
      throw "Please upload a file of extension type vcf."
  }

  return rl;
}

function defineVCFAttributes(vcfAttrib, line) {
  // ##fileformat=VCFv4.1
  if (!vcfAttrib.vcf_v) {
    vcfAttrib.vcf_v = line.match(/^##fileformat=/) ? line.split('=')[1] : null
  }

  // ##samtoolsVersion=0.1.19-44428cd
  if (!vcfAttrib.samtools) {
    vcfAttrib.samtools = line.match(/^##samtoolsVersion=/) ? line.split('=')[1] : null
  }

  // ##reference=file://../index/Chalara_fraxinea_TGAC_s1v1_scaffolds.fa
  if (!vcfAttrib.refseq) {
    vcfAttrib.refseq = line.match((/^##reference=file:/)) ? line.split('=')[1] : null
  }

  return vcfAttrib;
}

function parseSampleInfo(numSamples, sampleIndex, info) {
  // format information ids
  var formatIds = info[8].split(':')

  // parse the sample information
  var sampleObject = []
  for (var j = 0; j < numSamples; j++) {
    var sampleData = {}
    sampleData['NAME'] = sampleIndex[j]
    var formatParts = info[9 + j].split(':')
    for (var k = 0; k < formatParts.length; k++) {
      sampleData[formatIds[k]] = formatParts[k]
    }
    sampleObject.push(sampleData)
  }

  return sampleObject;
}

function parseVariantData(varInfo, info) {
  //Better to make varInfo again here?? 
  var infoObject = {}

  // check if the variant is INDEL or SNP
  // and assign the specific type of variation identified
  var type
  var typeInfo
  if (varInfo[0].match(/^INDEL$/)) {
    type = 'INDEL'
    varInfo.shift()
    if (info[3].length > info[4].length) {
      typeInfo = 'deletion'
    } else if (info[3].length < info[4].length) {
      typeInfo = 'insertion'
    } else if (info[3].length === info[4].length) {
      typeInfo = 'substitution - multi'
    }
  } else {
    type = 'SNP'
    if (info[3].length === 1) {
      typeInfo = 'substitution'
    } else if (info[3].length > 1) {
      typeInfo = 'substitution - multi'
    }
  }
  infoObject['VAR'] = type
  infoObject['VARINFO'] = typeInfo

  // variant info added to object
  for (var l = 0; l < varInfo.length; l++) {
    var pair = varInfo[l].split('=')
    infoObject[pair[0]] = pair[1]
  }

  return infoObject;
}

function createVariantData(info, infoObject, sampleObject, vcfAttrib) {

  var varData = {
    chr: info[0],
    pos: info[1],
    id: info[2],
    ref: info[3],
    alt: info[4],
    qual: info[5],
    filter: info[6],
    varinfo: infoObject,
    sampleinfo: sampleObject,
    attributes: vcfAttrib
  }

  return varData;
}

function createMap(vcfObj, varData) {
  if (vcfObj.size === 0) {
    varData.sampleinfo.forEach(function (sample) {
      vcfObj.set(sample.NAME, new Map());
    });
  }
  //gets all possible alleles for the current id
  var possibleAlleles = [];
  possibleAlleles.push(varData.ref);
  var altAlleles = varData.alt.split(/[,]+/);
  for (var i = 0; i < altAlleles.length; i++) {
    if (altAlleles[i] == ".") {
      altAlleles.splice(i, 1);
      --i;
    }
  }
  if (altAlleles.length > 0) {
    possibleAlleles = possibleAlleles.concat(altAlleles);
  }

  varData.sampleinfo.forEach(function (sample) {
    //gets the allele indices
    var alleles = sample.GT.split(/[|/]+/, 2);
    //gets the alleles from the allele indices and replaces the indices with the alleles.
    for (var i = 0; i < alleles.length; i++) {
      //if the allele is ".", treat it as the ref allele
      if (alleles[i] == ".") {
        alleles[i] = possibleAlleles[0];
      }
      else {
        alleles[i] = possibleAlleles[alleles[i]];
      }
    }

    vcfObj.get(sample.NAME).set(varData.id, alleles);
  });

  return vcfObj;
}

