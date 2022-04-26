# PRSKB

The Polygenic Risk Score Knowledge Base (PRSKB) is a website and command-line interface tool designed to facilitate the calculation of polygenic risk scores using genome-wide association studies from the [NHGRI-EBI Catalog](https://www.ebi.ac.uk/gwas).

## Website

The PRSKB website offers users the ability to calculate polygenic risk scores across multiple traits with minimal effort. The website not only offers the calculator, but additional information and tools to aid in calculations and data comparisons.

Website Link: [https://prs.byu.edu](https://prs.byu.edu)

### Calculate
The Calculate page of the PRSKB website allows the user to calculate polygenic risk scores for multiple samples. As of March 16, 2022, the PRSKB database contains the following data derived from the GWAS Catalog: 250,134 variant associations; 125,433 unique single nucleotide polymorphisms; 20,798 unique study and trait combinations; 10,366 GWA study identifiers; and 3,463 PubMed identifiers. The PRSKB is automatically updated with new studies from the GWAS Catalog monthly. Using an input VCF or inputted rsIDs and genotypes, reference genome, super population of the samples, p-value cutoff, and selected studies, polygenic risk scores can be calculated for the input samples. Results can be downloaded as a tsv or json file.

*Note*: Due to the vast number of studies the PRSKB has access to, it is not feasible to calculate PRS for them all on the website. If you wish to run large amounts of studies in a single run, see our [Command-Line Interface download (CLI)](https://prs.byu.edu/cli_download). Our current limit for number of studies to be run at a time is 500, although we strongly recommend using the CLI for anything more than 50 studies. 

#### Uploading GWAS Summary Statistic Data
In addition to calculating polygenic risk scores using GWA studies from the GWAS Catalog stored in our database, users have the option to upload their own GWAS summary statistics to use in risk score calculations. 

The GWAS summary statistics file to be uploaded **must** be in the correct format. It should be either a .tsv or a .txt tab separated file. The following columns are required and must be included in the file's header line: Study ID, Trait, RsID, Chromosome, Position, Risk Allele, Odds Ratio, and P-value. If the summary statistics use beta values instead of odds ratios, replace the "Odds Ratio" column with two columns: "Beta Coefficients" and "Beta Units". Additional optional columns that will be included if present are: P-Value Annotation, Beta Annotation, Citation, and Reported Trait. Column order does not matter and there may be extra columns present in the file. Required and optional header names must be exact. Note that if P-value Annotation and/or Beta Annotation are present, then the calculator will separate calculations by those columns. If you do not wish for this to happen, do not include those optional columns.

If more than one odds ratio exists for an RsID/allele combination in a study, the tool will exit. Although we perform strand flipping on GWAS summary statistics data we use from the GWAS Catalog, *we do not currently perform strand flipping on GWAS data uploaded to the website.* Please ensure that your data are presented on the correct strand or use the CLI tool.

### Studies
The Studies page of the PRSKB website includes a link to the published paper, information on citing the PRSKB, and the ability to search the database of GWAS studies procured from the [GWAS Catalog](https://www.ebi.ac.uk/gwas).

### Download
The Download page houses the link to download the command-line interface tool and additional videos of setting up and running the tool. 

### Visualize
The Visualize page allows users to view polygenic risk score distributions and statistics for 500,000 individuals from the UK Biobank, as well as from other cohorts including 1000 Genomes super populations and cohorts from the ADNI database. Since individual scores are only a relative metric to be understood in comparison to others within a population, this page allows for an approximate contextualization of scores received from the Calculate page.

## Command-Line Interface

The command-line interface (CLI) allows users to run larger analyses straight from their command-line. In addition to this, the tool has a built-in, interactive menu for searching studies and traits in the database, printing out available ethnicities from the database, and learning more about tool parameters. 

[Download CLI](https://prs.byu.edu/download_cli)

Required installed programs: Bash and jq for bash, Python3 and the PyVCF, filelock, and requests Python modules

## CLI Example

```bash
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR
```

More CLI examples can be found in the README.md file included in the CLI download or on the [readthedocs page](https://polyriskscore.rtfd.io) for the tool.

## Output Results

There are two choices for the tsv output results - condensed (default) or full. Additonally, you can choose to output results in JSON format, which contains all the information found in the 'full' format. Explanations of the columns found in the output are given below.

- **Study ID** -- The study identifier assigned by the GWAS Catalog (or the user if they uploaded their own GWAS summary statistics)
- **Reported Trait** -- Trait based on the phenotype being studied, as described by the authors
- **Trait** -- Trait assigned by the GWAS Catalog, standardized from the Experimental Factor Ontology
- **Citation** -- The citation of the study
- **P-Value Annotation** -- Additional information about the p-values
- **Beta Annotation** -- Additional information about the beta values
- **Score Type** -- This indicates if the study used odds ratios or beta values
- **Units (if applicable)** -- This column will contain the beta units if the Score Type is beta. 
- **SNP Overlap** -- Details the number of SNPs that are in the input vcf/txt file which are also in the study and not excluded from the calculation (see below)
- **SNPs Excluded Due To Cutoffs** -- Details the number of snps excluded from the study calculation due to p-value cutoff or minor allele frequency threshold
- **Included SNPs** -- The total number of SNPs included in the calculation
- **Used Super Population** -- The super population used for linkage disequillibrium

#### Columns Available Only In The Full Version
- **Percentile** -- Indicates the percentile rank of the samples polygenic risk score *(also included in the condensed version of .txt input files)
- **Protective Variants** -- Variants that are protective against the phenotype of interest
- **Risk Variants** -- Variants that add risk for the phenotype of interest
- **Variants Without Risk Alleles** -- Variants that are present in the study, but the sample does not possess the allele reported with association. Note that a SNP may be in this list and also in the Protective Variants or Risk Variants list. This is caused by an individual being heterozygous for the alleles at that point. 
- **Variants in High LD** -- Variants that are not used in the calculation, due to them being in high linkage disequillibrium with another variant in the study.

### Condensed

This version of the output results contains one row for each study with columns for each sample's polygenic risk score. A column will be named using the samples identifier and that column will hold their risk scores. 

Study ID | Reported Trait | Trait | Citation | P-Value Annotation | Beta Annotation | Score Type | Units (if applicable) | SNPs Excluded Due To Cutoffs | Used Super Population | SNP Overlap | Included SNPs | Sample1 | Sample2 | Sample3 | ect. 

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS

### Full

This version of the output results contains one row for each sample/study pair. It also includes columns listing the rsIDs of the snps involved in the risk score calculation. 

Sample | Study ID | Reported Trait | Trait | Citation | P-Value Annotation | Beta Annotation | Score Type | Units (if applicable) | SNPs Excluded Due To Cutoffs | Used Super Population | SNP Overlap | Included SNPs | Polygenic Risk Score | Protective Variants | Risk Variants | Variants Without Risk Allele | Variants in High LD

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.tsv -c 0.0005 -r hg19 -p SAS -v

### JSON

This version outputs the results in a json object format. The output automatically contains all the data the full version does and there is no condensed version of the json output. The file will contain a list of json study objects. Each study object will contain the list of samples and their score. 

.. code-block:: bash
    # example output
    [
        {
            "studyID": "GCST001",
            "reportedTrait": "Alzheimer's Disease",
            "trait": "Alzheimer Disease",
            "citation": "First Author et al. 2021",
            "pValueAnnotation": "NA",
            "betaAnnotation": "NA",
            "scoreType": "OR",
            "units (if applicable)": "NA",
            "excludedSnps": 3,
            "usedSuperPop": "EUR",
            "samples": [
                {
                    "sample": "SAMP001",
                    "polygenicRiskScore": "1.277",
                    "protectiveAlleles": "rs1|rs2|rs3",
                    "riskAlleles": "rs4|rs5|rs6|rs7|rs8",
                    "variantsWithoutRiskAllele": "rs9|rs10|rs11|rs14",
                    "variantsInHighLD": "rs12|rs13",
                    "snpOverlap": 8,
                    "includedSnps": 14
                },
                {
                    "sample": "SAMP002",
                    "polygenicRiskScore": "NF",
                    "protectiveAlleles": "",
                    "riskAlleles": "",
                    "variantsWithoutRiskAllele": "rs1|rs2|rs3|rs4|rs5|rs6|rs7|rs8|rs9|rs10|rs11|rs14",
                    "variantsInHighLD": "rs12|rs13",
                    "snpOverlap": 8,
                    "includedSnps": 14
                },
                {
                    "sample": "SAMP003",
                    "polygenicRiskScore": "1.63",
                    "protectiveAlleles": "rs1|rs2|rs3",
                    "riskAlleles": "rs4|rs5|rs6|rs7|rs8",
                    "variantsWithoutRiskAllele": "rs1|rs2|rs3|rs4|rs5|rs6|rs7|rs8|rs9|rs10|rs11|rs14",
                    "variantsInHighLD": "rs12|rs13",
                    "snpOverlap": 8,
                    "includedSnps": 14
                }
            ]
        }
    ]

.. code-block:: bash

   ./runPrsCLI.sh -f path/to/file/samples.vcf -o path/to/file/output.json -c 0.0005 -r hg19 -p SAS

## Citing this work

Please visit the [Studies](https://prs.byu.edu/studies.htm) page of the website for information on how to cite this tool and GWAS publications used. 

##License

This work is freely available for academic and not-for-profit use. However, commercial use is regulated by © 2020 Brigham Young University. All rights reserved. For more information about commercial use of this product, please contact Justin Miller, Ph.D. ([justin.miller@uky.edu](mailto:justin.miller@uky.edu)) or Keoni Kauwe, Ph.D. ([kauwe@byu.edu](mailto:kauwe@byu.edu)).

## Acknowledgements

