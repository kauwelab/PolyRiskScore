# Polygenic Risk Score Knowledge Base Command-line Interface Calculator

The PRSKB CLI calculator is a conglomeration of python scripts directed by a bash script for calculating polygenic risk scores from given input files using GWAS data pulled from the GWAS Catalog stored on the PRSKB server. 

## Requirements

In order to run the PRSKB CLI calculator, you must have ***python3*** and ***bash*** installed in the environment you will be running the tool in. Additionally, the Python modules ***PyVCF***, ***filelock***, and ***requests*** are required. The Python modules can be installed using pip:

```bash
pip install PyVCF
pip install filelock
pip install requests
```

For certain tool functions accessed through the tool's menu, bash ***jq*** is required. To download on Ubuntu or Debian run:

```bash
sudo apt-get install jq
```

For other OS, download and install using the following link: [https://stedolan.github.io/jq/download/](https://stedolan.github.io/jq/download/)

## PRSKB CLI Download

This folder should contain the following files. If it does not, download the tool again from [https://prs.byu.edu/download_cli](https://prs.byu.edu/download_cli)

* runPrsCLI.sh
* connect_to_server.py
* grep_file.py
* parse_associations.py
* calculate_score.py

## Running the PRSKB CLI

There are two ways to run the PRSBK calculator. It can be run directly from the command-line or through the tool's menu.

### Running from the Command-line

To run the risk score calculator from the command-line, you should pass the required parameters to the script as shown below. You may also pass the file path to a zipped vcf or txt file. See the [Optional Filtering Parameters](#optional-filtering-parameters) section of this document to learn more about filtering studies for score calculations. 

#### Using a VCF with required parameters
```bash
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR
```

#### Using a TXT with required parameters
```bash
./runPrsCLI.sh -f inputFile.txt -o outputFile.tsv -r hg19 -c 0.05 -p EUR
```

*NOTE: Each line in the txt file should be formatted rsID:allele1,allele2*

### Running from the Menu

To access the PRSKB CLI menu, double click the file or run the script without any additional arguments on the command-line, and then follow the prompts to start the menu. Once the menu has been reached, choosing menu option "Run the PRSKB calculator" will initiate a prompt to perform polygenic risk score calculations. You will then pass the parameters in a similar fashion to running the calculator from the command-line.

## Parameters

Below is a breakdown and explanation of all the parameters that can be used with the PRSKB CLI tool.

### Required Parameters

These parameters must be present in order for the PRSKB CLI tool to run calculations. If any of these are missing, the tool will give you the option of printing out the usage statement or starting the interactive menu.

* **-f inputFilePath** -- The location of the file to calculate polygenic risk scores for. Can be a VCF or a TXT file (see note on [Using a TXT with required parameters](#using-a-txt-with-required-parameters) for the format of the txt file) or a zipped VCF or TXT file. 
* **-o outputFilePath** -- The location where the output file should be created. Must be either a TSV or a JSON file.
* **-r refGen** -- The reference genome used to sequence the variants in the input file. Acceptable values are **hg17**, **hg18**, **hg19**, and **hg38**.
* **-c pValueCutoff** -- The p-value cutoff for SNPs that will be included. Any SNP that has a p-value greater than the cutoff will not be considered for calculation.
* **-p superPopulation** -- The super population of the samples in the input file. This parameter is used for performing linkage-disequilibrium clumping. Acceptable values are **AFR**, **AMR**, **EAS**, **EUR**, and **SAS**.

### Optional Filtering Parameters 

In addition to running calculations on all the study/trait combinations in our database, you can choose to filter which studies you want to recieve polygenic risk score results for by adding additional parameters.

* **-t trait** -- Adding trait filters will filter out all studies that do not include the traits specified (see note on studyID).
* **-k studyType** -- Adding study types will filter out all studies except those labeled as the desired study type (see note on studyID). Acceptable values are **HI** (High Impact), **LC** (Large Cohort), and **O** (Other).
* **-i studyID** -- Adding a GWAS Catalog Study Accession number (study ID) will ensure that the study corresponding to the study ID given will have polygenic risk scores calculated for it. *NOTE: The study ID filter is not affected by other filters and the calculator will run for the study corresponding to the study ID given, notwithstanding the presence of other filters.*
* **-e ethnicity** -- Adding an ethnicity filter will restrict risk score calculations to those studies that report the given ethnicity in either their discovery sample ancestry or their replication sample ancestry (see note on studyID).

Traits and studies available through this tool can be searched from the PRSKB CLI interactive menu using the *Search for a specific study or trait* option. A list of ethnicities from the server can be printed using the *View available ethnicities for filter* menu option. 

### Additional Optional Parameters

* **-v verbose result file** -- Adding the **-v** parameter will return the output file in a 'verbose' format, which includes a line for each sample/study/trait combination. Additional columns are added that display lists of protective variants, risk variants, variants that are present but do not include the risk allele, and variants that are in high linkage disequilibrium whose odds ratios are not included in the calculations. *NOTE: This only applies to TSV output files. JSON output files are always 'verbose'.*
* **-g defaultSex** -- This parameter will set the default sex for the samples in the input file. Though a rare occurence, some studies have duplicates of the same SNP that differ by which biological sex the p-value is associated with. You can indicate which sex you would like SNPs to select when both options (M/F) are present. The system default is Female."
* **-s stepNumber** -- The calculator can be run in two steps. The first step deals with downloading necessary information for calculations from our server. The second step is responsible for performing the actual calculations and does not require an internet connection. Running the tool without a specified step number will run both steps sequentially. 
* **-n numberOfSubprocesses** -- The calculations for each trait/study can be run using multiprocessing. Users can designate the number of subprocesses used by the multiprocessing module. If no value is given, all available cores will be used.
* **-m omitUnusedStudiesFile** -- Prevents the creation of the additional output file that lists the trait/study combinations that produced no risk score due to the absence of the study's SNPs in the samples vcf/txt file. 
* **-u userGWASUploadFile** -- This parameter allows the user to upload a GWAS summary statistics file to be used in polygenic risk score calculations instead of GWAS Catalog data stored in our database. The file must be tab separated, use a .tsv or .txt extension (or be a zipped file with one of those extensions), and have the correct columns in order for calculations to occur. See [Uploading GWAS Summary Statistics](#uploading-gwas-summary-statistics) for more directions on uploading GWAS data. 
* **-a GWASrefGen** -- Indicates the reference genome of the GWAS data. If this parameter is not included, it is assumed that the reference genome for the GWAS data is the same as the samples. 

## Uploading GWAS Summary Statistics

In addition to calculating polygenic risk scores using GWA studies from the GWAS Catalog stored in our database, users have the option to upload their own GWAS summary statistics to use in risk score calculations. 

### Format

The GWAS summary statistics file to be uploaded **must** be in the correct format. It should be either a .tsv or a .txt tab separated file, or a zipped .tsv or .txt. The following columns are required and must be included in the file's header line: Study ID, Trait, RsID, Chromosome, Position, Risk Allele, Odds Ratio, and P-value. Additional optional columns that will be included if present are: Citation and Reported Trait. Column order does not matter and there may be extra columns present in the file. Required and optional header names must be exact. 

If more than one odds ratio exists for an RsID in a study, the odds ratio and corresponding risk allele with the most significant p-value will be used. Additonally, though we perform strand flipping on GWAS summary statistics data we use from the GWAS Catalog, we do not perform strand flipping on uploaded data. Please ensure that your data is presented on the correct strand.

*NOTE: If a GWAS data file is specified, risk scores will only be calculated on that data. No association data from the PRSKB will be used. Additionally, the optional params -t, -k, -i, -e, and -g will be ignored.*

### Columns

Below is a brief overview of the required and optional columns for uploading GWAS summary statistics data.

#### Required Columns

1. Study ID - A unique study identifier. In our database, we use GWAS Catalog study identifiers. As long as this is unique for each study, it can be whatever you want.
2. Trait - The Experimental Factor Ontology (EFO) trait the GWAS deals with.
3. RsID - The Reference SNP cluster ID (RsID) of the SNP.
4. Chromosome - The chromosome the SNP resides on.
5. Position - The position of the SNP in the reference genome.
6. Risk Allele - The allele that confers risk or protection.
7. Odds Ratio - Computed in the GWA study, a numerical value of the odds that those in the case group have the allele of interest over the odds that those in the control group have the allele of interest.
8. P-value - The probability that the risk allele confers the amount of risk stated.

#### Optional Columns

1. Citation - The citation information for the study.
2. Reported Trait - Trait description for this study in the authors own words.

## Examples

#### Filtering By Trait
```bash
# runs the calculator on studies that include the "Alzheimer's Disease" trait
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t "Alzheimer's Disease"
# runs the calculator on studies that include the Acne trait
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t Acne
# runs the calculator on studies that include the "Alzheimer's Disease" trait or the Acne trait
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t "Alzheimer's Disease" -t acne
```

#### Filtering By Study Type
```bash
# runs the calculator on studies that are High Impact
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -k HI
# runs the calculator on studies that are High Impact or have a Large Cohort
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -k HI -k LC
```

#### Filtering By Study ID
```bash
# runs the calculator on the study corresponding to the studyID GCST000001
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -i GCST000001
# runs the calculator on the study corresponding to the studyID GCST000001 and the study corresponding to the studyID GCST000010
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -i GCST000001 -i GCST000010
```

#### Filtering By Ethncity
```bash
# runs the calculator on studies that include European ancestry
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -e European
# runs the calculator on studies that include East Asian ancestry
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -e "East Asian"
# runs the calculator on studies that include European or East Asian ancestry
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -e European -e "East Asian"
```

#### Requesting a Verbose File
```bash
# runs the calculator and returns a 'verbose' tsv output file
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -v
```

#### Specifying a Default Sex
```bash
# runs the calculator specifying Male as the default sex
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -g Male
```

#### Applying Step Numbers
```bash
# runs the calculator in two steps
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -s 1
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -s 2
# runs the calculator in two steps with additional filters
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t Acne -s 1
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t Acne -s 2
# runs the calculator multiple times using the same "all_associations_hg19_f.txt" working file but different input files and filters
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -s 1
./runPrsCLI.sh -f inputFile_2.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t Acne -k HI -s 2
./runPrsCLI.sh -f inputFile_2.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t "Alzheimer's Disease" -k LC -e European -s 2
```

#### Specifying Number of Subprocesses
```bash
# runs the calculator using 4 subprocessors
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -n 4
```

#### Using All Filter Types
```bash
# runs the calculator on studies with the trait "Alzheimer's Disease", European ethnicty, and are High Impact, and the study corresponding to the studyID GCST000001
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t "Alzheimer's Disease" -e European -k HI -i GCST000001
```

#### Additional Step Number Example
```bash
# calculates scores for all studies for inputFile.vcf, then using the already downloaded allAssociations_hg19_f.txt file, calculates scores for inputFile_1.vcf using the given filters
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR
./runPrsCLI.sh -f inputFile_1.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR -t Insomnia -t acne -i GCST000010 -k O -s 2
```

#### Uploading GWAS summary statistics files
```bash
# calculates risk scores using the provided GWAS summary statistics data. 
./runPrsCLI.sh -f inputFile.vcf -o outputfile.tsv -r hg19 -c 0.05 -p EUR -u GWASsummaryStatistics.tsv -a hg38
# if the -a parameter is not supplied, it is assumed that the reference genome of the file passed to -u is the same as the reference genome passed for the input file (-r)
./runPrsCLI.sh -f inputFile.vcf -o outputfile.tsv -r hg19 -c 0.05 -p EUR -u GWASsummaryStatistics.tsv
```

## Individual File Breakdown

1. **runPrsCLI.sh** - Bash script that calls the appropriate python scripts. Also holds the tool's menu, accessed by running the tool without any parameters. This is the only script that the user will directly run.
2. **connect_to_server.py** - Python script that connects to the PRSKB database to download the correct association and linkage-disequilibrium clump information for risk score calculations. If an upload GWAS summary statistics file is used, it formats the data to use calculations and downloads linkage-disequilibrium clump information. This script requires an internet connection to run.
3. **grep_file.py** - Creates a filtered input file using the input file given and the requested parameters. This filtered file will only retain lines from the given input file that contain SNPs included in the association data for calculations.
4. **parse_associations.py** - Python script that parses through the filtered input file, and for each study/trait organizes the data necessary for PRS calculations, which is then passed to the calculate_score.py script.
5. **calculate_score.py** - Calculates the risk scores for each study/trait combination using the data passed from the parse_associations.py and prints the results to the specified output file.

## .workingFiles Directory

The .workingFiles directory is created by this tool to hold various files necessary to calculate polygenic risk scores. Each file is vital to the calculation process and can cause the tool to quit prematurly if it is not present. Details on these files can be found below.

### Association Files

Association files hold the association data downloaded from our server required to calculate polygenic risk scores. These files are created in the connect_to_server.py script as part of step 1. There are two naming conventions for associations files:

* **allAssociations_{refGen}_{sex}.txt** -- This associations file is downloaded from the server when no filters are supplied. It contains all the associations from the server and is formatted for the specified reference genome (refGen) and default sex (sex). This file is not deleted by the tool, but is updated when the server has new data. In this way, this file can be used for multiple calculations (see [Additional Step Number Example](#additional-step-number-example)).
* **associations_{ahash}.txt** -- This associations file is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).
* **GWASassociations_{bhash}.txt** -- This associations file is created when using user supplied GWAS summary statistics data. The number at the end of the file name (bhash) is a hash created using the five required parameters as well as the -u and -a parameters.

### Trait/StudyID to SNPs Files

These files contain a dictionary of trait/studyID combinations to a list of SNPs. They are created in the connect_to_server.py script as part of step 1. There are two naming conventions for associations files:

* **traitStudyIDToSnps.txt** -- This file is downloaded from the server when no filters are supplied. It contains a dictionary of all trait/studyID combinations to a list of all the SNPs included in the study. This file is not deleted by the tool, but is updated when the server has new data. In this way, this file can be used for multiple calculations (see [Additional Step Number Example](#additional-step-number-example)).
* **traitStudyIDToSnps_{ahash}.txt** -- This file is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).
* **traitStudyIDToSnps_{bhash}.txt** -- This file is created when using user supplied GWAS summary statistics data. The number at the end of the file name (bhash) is a hash created using the five required parameters as well as the -u and -a parameters.

### Clumping Files

Clumping files hold pre-computed linkage disequilibrium clump numbers for SNPs downloaded from the server. They are created in the connect_to_server.py script as part of step 1. There are two naming conventions for clumping files:

* **{superPop}\_clumps\_{refGen}.txt** -- This clumping file is downloaded from the server when no filters are supplied. It contains each SNP from the server and a corresponding number that represents its linkage disequilibrium. The file is formatted for the specified reference genome (refGen) and super population (superPop). This file is not deleted by the tool, but is updated when the server has new data. In this way, this file can be used for multiple calculations (see [Additional Step Number Example](#additional-step-number-example)).
* **{superPop}\_clumps\_{refGen}_{ahash}.txt** -- This clumping file is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).
* **{superPop}\_clumps\_{refGen}_{bhash}.txt** -- This clumping file is created when using user supplied GWAS summary statistics data. The number at the end of the file name (bhash) is a hash created using the five required parameters as well as the -u and -a parameters.

### Clump Number Dictionary Files

In addition to the [Clumping Files](#clumping-files) above, clump number dictionary files are created in the grep_file.py script as part of step 2. The clump number dicionaries help speed up the calculation process by informing the tool which variants are not in linkage disequilibrium with any other SNP.

* **clumpNumDict_{refGen}.txt** -- This clump number dictionary is created when no filters are supplied. The dictionary keys are made up of numbers representing linkage disequilibrium regions. The value for each clump number key is a list of SNPs that reside in that LD region. The clump number dictionary is specific to the reference genome (refGen) that matches the input file.
* **clumpNumDict_{refGen}_{ahash}.txt** -- This clump number dictionary is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).

### Filtered Files

Filtered files are created in order to speed up the calculation process. In the grep_file.py script as part of step 2, the input VCF or TXT file is filtered so that only SNPs that are present in the designated studies are maintained in a new temporary file. This file is named as follows:

* **filteredInput_{uniq}.txt** -- where 'uniq' is a uniqe timestamp for the particular user. 

For each study/trait, we create an additional temporary file that includes only SNPs from the above file that are included in the study/trait. This file is created in the parse_associations.py script in step 2 and is named as follows:

* **{t}\_{s}\_{uniq}.txt** -- where 't' referes to the trait, 's' refers to the study, and 'uniq' is a uniqe timestamp for the particular user. 

Each filtered file is removed before the program finishes.






