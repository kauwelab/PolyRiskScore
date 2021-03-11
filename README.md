# PRSKB

The Polygenic Risk Score Knowledge Base (PRSKB) is a website and command-line interface tool designed to facilitate the calculation of polygenic risk scores using genome-wide association studies from the [NHGRI-EBI Catalog](https://www.ebi.ac.uk/gwas). 

## Website

The PRSKB website offers users the ability to calculate polygenic risk scores across multiple traits with minimal effort. The website not only offers the calculator, but additional information and tools to aid in calculations and data comparisons. 

Website Link: [https://prs.byu.edu](https://prs.byu.edu)

### Calculate
The Calculate page of the PRSKB website allows the user to calculate polygenic risk scores for multiple samples across 2183 trait/study combinations. Using an input VCF or inputted rsIDs and genotypes, reference genome, super population of the samples, default biological sex, p-value cutoff, and selected studies polygenic risk scores can be calculated for the inputted samples. Results can be downloaded as a tsv or json file. 

### Cite
The Cite page of the PRSKB website includes a link to the published paper, information on citing the PRSKB, and the ability to search the database of GWAS studies procured from the [GWAS Catalog](https://www.ebi.ac.uk/gwas).

### Download
The Download page houses the link to download the command-line interface tool and additional videos of setting up and running the tool. 

### UKBB
\*BLURB HERE\*

## Command-Line Interface

The command-line interface (CLI) allows users to run larger analyses straight from their command-line. In addition to this, the tool has a built-in, interactive menu for searching studies and traits in the database, printing out available ethnicities from the database, and learning more about tool parameters. 

[Download CLI](https://prs.byu.edu/download_cli)

Required installed programs: Bash and jq for bash, Python3 and PyVCF python library

## CLI Example

```bash
./runPrsCLI.sh -f inputFile.vcf -o outputFile.tsv -r hg19 -c 0.05 -p EUR
```

More CLI examples can be found in the README.md file included in the CLI download or on the readthedocs page for the tool. 

