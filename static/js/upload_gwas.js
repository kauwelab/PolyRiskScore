  //If you want to get the return value from this function,
  //Make an asyncronous function that says
  //var text = await readFile... 
  var readFile = async() => { 

    var vcfFile = document.getElementById("gwas").files[0]; 
    console.log(vcfFile); 
    
    var reader = new Response(vcfFile); 
    var words = await reader.text();

    return words; 
 
  }

  var uploadGWAS = async() => {
      var text = await readFile(); 
      console.log(text); 
  }