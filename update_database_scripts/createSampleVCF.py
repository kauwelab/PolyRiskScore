import sys
print (sys.version)


import requests
import myvariant
import sys
from sys import argv
import json
import os

# This script creates a test VCF using one SNP from every study in the database. The VCF has 3 samples, 
# one that is homozygous for the reference allele, one that is homozygous for the alternate allele and
# one that is heterozygous.
# How to run: python3 createSampleVCF.py "nameOfOutput" "sampleVCFFolderPath"
# where: "nameOfOutput" is the name of the VCF created (default "sample")
#        "sampleVCFFolderPath" is the path to the folder where the new VCF will be created (default: "../static/")


# name of sample output vcf
output = argv[1] if len(sys.argv) > 1 else "sample"
# path to sample output vcf folder
sampleVCFFolderPath = argv[2] if len(sys.argv) > 2 else "../static/"
# combine path and vcf name
sampleVCFPath = os.path.join(sampleVCFFolderPath, output + ".vcf")
print(sampleVCFPath)

# get a single snp from each study
response = requests.get("https://prs.byu.edu/single_snp_from_each_study")
response.close()
assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
snpsData = response.json()
snpsData = list({v['snp']:v for v in snpsData}.values())
snps = set()

for obj in snpsData:
    snps.add(obj['snp'])

# grab the information about the rsID
mv = myvariant.MyVariantInfo()
queryResults = mv.querymany(snps, scopes='dbsnp.rsid', fields='dbsnp.ref, dbsnp.alt, dbsnp.hg19.start, dbsnp.chrom')
snpRefAlleleDict = {}

for line in queryResults:
    if line['query'] not in snpRefAlleleDict.keys():
        if "notfound" in line.keys():
            snpRefAlleleDict[line['query']] = {
                'ref': '.',
                'pos': 'NA',
                'chrom': 'NA',
                'alt': '.',
            }
        else:
            snpRefAlleleDict[line['query']] = {
                'ref': line['dbsnp']['ref'],
                'pos': line['dbsnp']['hg19']['start'] if 'hg19' in line['dbsnp'].keys() else "",
                'chrom': line['dbsnp']['chrom'],
                'alt': line['dbsnp']['alt']
            }

# write to the sample file
f = open(sampleVCFPath, "w")
f.write("##fileformat=VCFv4.2\n")
f.write("##FORMAT=<ID=GT,Number=1,Type=Integer,Description=\"Genotype\">\n")
f.write("##FORMAT=<ID=GP,Number=G,Type=Float,Description=\"Genotype Probabilities\">\n")
f.write("##FORMAT=<ID=PL,Number=G,Type=Float,Description=\"Phred-scaled Genotype Likelihoods\">\n")
f.write("#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMP001\tSAMP002\tSAMP003\n")

for i in range(len(snpsData)):
    snp = snpsData[i]['snp']
    ref = snpRefAlleleDict[snp]['ref']
    if  snpsData[i]['riskAllele'] == ref[0]:
        alt = snpRefAlleleDict[snp]['alt']
    else: 
        alt = snpsData[i]['riskAllele']
    hg19 = snpsData[i].pop('hg19')
    if (hg19 != "NA"):
        chrom, pos = hg19.split(":")
        f.write("{0}\t{1}\t{2}\t{3}\t{4}\t.\tPASS\t.\tGT\t0/1\t0/0\t1/1\n".format(chrom, pos, snp, ref, alt))
    elif snpRefAlleleDict[snpsData[i]['snp']]['pos'] != "":
        chrom = snpRefAlleleDict[snpsData[i]['snp']]['chrom']
        pos = snpRefAlleleDict[snpsData[i]['snp']]['pos']
        f.write("{0}\t{1}\t{2}\t{3}\t{4}\t.\tPASS\t.\tGT\t0/1\t0/0\t1/1\n".format(chrom, pos, snp, ref, alt))
        
f.close()



