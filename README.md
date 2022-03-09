# PRSKB

The Polygenic Risk Score Knowledge Base (PRSKB) is a website and command-line interface tool designed to facilitate the calculation of polygenic risk scores using genome-wide association studies from the [NHGRI-EBI Catalog](https://www.ebi.ac.uk/gwas).

## Website

The PRSKB website offers users the ability to calculate polygenic risk scores across multiple traits with minimal effort. The website not only offers the calculator, but additional information and tools to aid in calculations and data comparisons.

Website Link: [https://prs.byu.edu](https://prs.byu.edu)

### Calculate
The Calculate page of the PRSKB website allows the user to calculate polygenic risk scores for multiple samples across more than 2100 trait/study combinations. Using an input VCF or inputted rsIDs and genotypes, reference genome, super population of the samples, p-value cutoff, and selected studies, polygenic risk scores can be calculated for the inputted samples. Results can be downloaded as a tsv or json file.

#### Uploading GWAS Summary Statistic Data
In addition to calculating polygenic risk scores using GWA studies from the GWAS Catalog stored in our database, users have the option to upload their own GWAS summary statistics to use in risk score calculations. 

The GWAS summary statistics file to be uploaded **must** be in the correct format. It should be either a .tsv or a .txt tab separated file. The following columns are required and must be included in the file's header line: Study ID, Trait, RsID, Chromosome, Position, Risk Allele, Odds Ratio, and P-value. If the summary statistics use beta values instead of odds ratios, replace the Odds Ratio column with Beta Coefficients and Beta Units. Additional optional columns that will be included if present are: P-Value Annotation, Beta Annotation, Citation, and Reported Trait. Column order does not matter and there may be extra columns present in the file. Required and optional header names must be exact. Note that if P-value Annotation and/or Beta Annotation are present, then the calculator will separate calculations by those columns. If you do not wish for this to happen, do not include those optional columns.

If more than one odds ratio exists for an RsID in a study, the odds ratio and corresponding risk allele with the most significant p-value will be used. Additonally, although we perform strand flipping on GWAS summary statistics data we use from the GWAS Catalog, *we do not currently perform strand flipping on GWAS data uploaded to the website.* Please ensure that your data is presented on the correct strand.

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

## Citing this work

Please visit the [Studies](https://prs.byu.edu/studies.htm) page of the website for information on how to cite this tool and GWAS publications used. 

## Acknowledgements

