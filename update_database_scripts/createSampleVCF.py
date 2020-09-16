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
dictOfRefAlleles = mv.querymany(snps, scopes='dbsnp.rsid', fields='dbsnp.ref')

for thing in dictOfRefAlleles:
    print(thing)


