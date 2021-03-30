import subprocess
import sys
import os
import pandas as pd
import glob

# Create a .assoc file for each of the diseases
csv_file = pd.read_csv(sys.argv[1], usecols=['snp','hg38', 'riskAllele', 'pValue', 'oddsRatio', 'studyID'])
new = csv_file['hg38'].str.split(":", n=1, expand = True)
csv_file['CHR'] = new[0]
csv_file['BP'] = new[1]
csv_file.drop(columns = ['hg38'], inplace = True)
csv_file = csv_file.rename(columns={'snp':'SNP', 'riskAllele':'A1', 'pValue':'P', 'oddsRatio':'OR', 'studyID':'study'})

csv_file.to_csv('temp.csv', sep='\t', index=False)

