# Polygenic Risk Score Knowledge Base Command-line Interface Calculator

The PRSKB CLI calculator is a conglomeration of python scripts directed by a bash script 
for calculating polygenic risk scores from given input files using GWAS data pulled from the GWAS Catalog stored on the PRSKB server. 

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
* README.md

## Running the PRSKB CLI


## Individual File Breakdown

1. runPrsCLI.sh - Bash script that calls the appropriate python scripts. Also holds the tool's menu, accessed by running the tool without any parameters. This is the only script that the user will directly run.
2. connect_to_server.py - Python script that connects to the PRSKB database to download the correct association and linkage-disequilibrium clump information for risk score calculations. This script requires an internet connection to run.
3. grep_file.py - Creates a filtered input file using the input file given and the requested parameters. This filtered file will only retain lines from the given input file that contain snps included in the association data for calculations.
4. parse_associations.py - 
5. calculate_score.py - Calculates the risk scores for each study/trait combination using the data passed from the parse_associations.py and prints the results to the specified output file.