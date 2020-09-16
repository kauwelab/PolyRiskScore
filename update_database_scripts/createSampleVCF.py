import requests
import myvariant

# get a single snp from each study
response = requests.get("https://prs.byu.edu/single_snp_from_each_study")
response.close()
assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
snpsData = response.json()
snps = []

for obj in snpsData:
    snps.append(obj['snp'])

# 
mv = myvariant.MyVariantInfo()
queryResults = mv.querymany(snps, scopes='dbsnp.rsid', fields='dbsnp.ref')
snpRefAlleleDict = {}

for line in queryResults:
    if line['query'] not in snpRefAlleleDict.keys():
        if "notfound" in line.keys():
            snpRefAlleleDict[line['query']] = '.'
        else:
            snpRefAlleleDict[line['query']] = line['dbsnp']['ref']

for i in range(len(snpsData)):
    snpsData[i]['refAllele'] = snpRefAlleleDict[snpsData[i]['snp']]



