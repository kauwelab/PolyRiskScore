# Polygenic Risk Score Knowledge Base Command-line Interface Calculator

The PRSKB CLI calculator is a conglomeration of python scripts directed by a bash script for calculating polygenic risk scores from given input files using GWAS data pulled from the GWAS Catalog stored on the PRSKB server. 

## Requirements

In order to run the PRSKB CLI calculator, you must have ***python3*** and ***bash*** installed in the environment you will be running the tool in. Additionally, the Python library ***PyVCF*** is required. The Python library can be installed using pip:

```bash
pip install PyVCF
```

For certain tool functions accessed through the tool's menu, bash ***jq*** is required. To download on Ubuntu or Debian run:

```bash
sudo apt-get install jq
```

For other OS, see the proper way to download and install on [https://stedolan.github.io/jq/download/](https://stedolan.github.io/jq/download/)

## PRSKB CLI Download

This folder should contain the following files. If it does not, download the tool again from [https://prs.byu.edu/download_cli](https://prs.byu.edu/download_cli)

* runPrsCLI.sh
* connect_to_server.py
* grep_file.py
* parse_associations.py
* calculate_score.py

## Running the PRSKB CLI

There are two ways to run the PRSBK calculator. It can be run directly from the command line or it can be run through the tool's menu.

### Running from the Command Line

To run the risk score calculator from the command line, you should pass the required parameters to the script as shown below. You may also pass the file path to a zipped vcf or txt file. See the [Optional Filtering Parameters](#optional-filtering-parameters) section of this document to learn more about filtering studies for score calculations. 

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

To access the PRSKB CLI menu, click on the script in a file viewer or run the script without any additional arguments on the command line, and then follow the prompts to start the menu. Once the menu has been reached, choosing menu option "Run the PRSKB calculator" will initiate a prompt to perform polygenic risk score calculations. You will then pass the parameters in a similar fashion to running the calculator from the command line.

## Parameters

Below is a break down and explanation of all the parameters that can be used with the PRSKB CLI tool.

### Required Parameters

These parameters must be present in order for the PRSKB CLI tool to run calculations. If any of these are missing, the tool will give you the option of printing out the usage statement or starting the interactive menu.

* **-f inputFilePath** -- The location of the file to calculate polygenic risk scores for. Can be a VCF or a TXT file (see note on [Using a TXT with required parameters](#using-a-txt-with-required-parameters) for the format of the txt file) or a zip file of the VCF or TXT file. 
* **-o outputFilePath** -- The location the output file should be created at. Must be either a TSV or a JSON file.
* **-r refGen** -- The reference genome the samples in the input file. Acceptable values are **hg17**, **hg18**, **hg19**, and **hg38**.
* **-c pValueCutoff** -- The p-value cutoff for snps that will be included. Any snp that has a p-value greater than the cutoff will not be considered for calculation.
* **-p superPopulation** -- The 1000 genomes super population of the samples in the input file. This parameter is used for performing linkage-disequilibrium clumping. Acceptable values are **AFR**, **AMR**, **EAS**, **EUR**, and **SAS**.

### Optional Filtering Parameters 

In addition to running calculations on all the study/trait combinations in our database, you can choose to filter which studies you want to recieve polygenic risk score results for by adding additional parameters.

* **-t trait** -- Adding trait filters will filter out all studies that do not include the traits specified (see note on studyID)
* **-k studyType** -- Adding study types will filter out all studies except those labeled as the desired study type (see note on studyID). Acceptable values are **HI** (High Impact), **LC** (Large Cohort), and **O** (Other).
* **-i studyID** -- Adding a study ID will ensure that the study corresponding to the study ID given will have polygenic risk scores calculated for it. *NOTE: The study ID filter is not affected by other filters and the calculator will run for the study corresponding to the study ID given, notwithstanding the presence of other filters.*
* **-e ethnicity** -- Adding an ethnicity filter will restrict risk score calculations to those studies that report the given ethnicity in either their discovery sample ancestry or their replication sample ancestry. (see note on studyID)

Traits and studies available through this tool can be searched from the PRSKB CLI interactive menu using the *Search for a specific study or trait* option. A list of ethnicities from the server can be printed using the *View available ethnicities for filter* menu option. 

### Additional Optional Parameters

* **-v verbose result file** -- Adding the **-v** parameter will return the output file in a 'verbose' format, switching to including a line for each sample/study/trait combination. Additional columns are added that display lists of protective variants, risk variants, variants that are present but do not include the risk allele, and variants that are in high linkage disequilibrium whose odds ratios are not included in the calculations. *NOTE: This only applies to TSV output files. JSON output files are always 'verbose'.*
* **-g defaultSex** -- This parameter will set the default sex for the samples in the input file. Though a rare occurence, some studies have duplicates of the same snp that differ by which biological sex the p-value is associated with. You can indicate which sex you would like snps to select when both options (M/F) are present. The system default is Female."
* **-s stepNumber** -- The calculator can be run in two steps. The first step deals with downloading necessary information for calculations from our server. The second step is responsible for performing the actual calculations and does not require an internet connection. Running the tool without a specified step number will run both steps sequentially. 
* **-n numberOfSubprocesses** -- @Liz add despcription

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

## Individual File Breakdown

1. **runPrsCLI.sh** - Bash script that calls the appropriate python scripts. Also holds the tool's menu, accessed by running the tool without any parameters. This is the only script that the user will directly run.
2. **connect_to_server.py** - Python script that connects to the PRSKB database to download the correct association and linkage-disequilibrium clump information for risk score calculations. This script requires an internet connection to run.
3. **grep_file.py** - Creates a filtered input file using the input file given and the requested parameters. This filtered file will only retain lines from the given input file that contain snps included in the association data for calculations.
4. **parse_associations.py** - @Liz add despcription
5. **calculate_score.py** - Calculates the risk scores for each study/trait combination using the data passed from the parse_associations.py and prints the results to the specified output file.

## .workingFiles Directory

The .workingFiles directory is created by this tool to hold various files necessary to calculate polygenic risk scores. Each file is important in their own way and can cause the tool to quit prematurly if it is not present. 

### Association Files

Association files hold the association data downloaded from our server required to calculate polygenic risk scores. These files are created in the connect_to_server.py script as part of step 1. There are two naming conventions for associations files:

* **allAssociations_{refGen}_{sex}.txt** -- This associations file is downloaded from the server when no filters are supplied. It contains all the associations from the server and is formatted for the specified reference genome (refGen) and default sex (sex). This file is not deleted by the tool, but is updated when the server has new data. In this way, this file can be used for multiple calculations (see [Additional Step Number Example](#additional-step-number-example)).
* **associations_{ahash}.txt** -- This associations file is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).

### Trait/StudyID to Snps Files

These files contain a dictionary of trait/studyID combinations to a list of snps. They are created in the connect_to_server.py script as part of step 1. There are two naming conventions for associations files:

* **traitStudyIDToSnps.txt** -- This file is downloaded from the server when no filters are supplied. It contains a dictionary of all trait/studyID combinations to a list of all the snps included in the study. This file is not deleted by the tool, but is updated when the server has new data. In this way, this file can be used for multiple calculations (see [Additional Step Number Example](#additional-step-number-example)).
* **traitStudyIDToSnps_{ahash}.txt** -- This file is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).

### Clumping Files

Clumping files hold pre-computed clump numbers for snps downloaded from the server. They are created in the connect_to_server.py script as part of step 1. There are two naming conventions for clumping files:

* **{superPop}\_clumps\_{refGen}.txt** -- This clumping file is downloaded from the server when no filters are supplied. It contains all the clump numbers from the server and is formatted for the specified reference genome (refGen) and super population (superPop). This file is not deleted by the tool, but is updated when the server has new data. In this way, this file can be used for multiple calculations (see [Additional Step Number Example](#additional-step-number-example)).
* **{superPop}\_clumps\_{refGen}_{ahash}.txt** -- This clumping file is created when specific filters are given to narrow down the studies used in calculations. The number at the end of the file name (ahash) is a hash created using all the given parameters. This allows the tool to use the correct file for calculations, especially when the stepNumber parameter is included (see the second example under [Applying Step Numbers](#applying-step-numbers)).

### Clump Number Dictionary Files

In addition to the [Clumping Files](#clumping-files) above, clump number dictionary files are created in the grep_file.py script as part of step 2. @LIZ fill out this section

* **clumpNumDict_{refGen}.txt** --
* **clumpNumDict_{refGen}_{ahash}.txt** --

### Filtered Files

Filtered files are created during step 2. @LIZ fill out this section

* **filteredInput_{uniq}.txt** -- 






