import json
import requests
from sys import argv
import os

snpDict = argv[1]
outputSnpTsv = argv[2]
cohort = argv[3].lower()
base = os.path.dirname(argv[0])

snpDict = os.path.join(base, snpDict)
outputSnpTsv = os.path.join(base, outputSnpTsv)

with open(snpDict, "r") as snpsDictFile:
	ukbbSnpsDict = json.load(snpsDictFile)

response = requests.get(url="https://prs.byu.edu/get_traitStudyID_to_snp")
response.close()
traitStudyIDtoSnps = response.json()


with open(outputSnpTsv, 'w') as ukbbSnpsFile:
	for key in traitStudyIDtoSnps:
		trait, studyID = key.split("|")
		if studyID in ukbbSnpsDict:
			snpsInBoth = list(set(traitStudyIDtoSnps[key])&set(ukbbSnpsDict[studyID]))
			lineArray = [studyID, trait, "|".join(snpsInBoth), cohort]
			ukbbSnpsFile.write("\t".join(lineArray))
			ukbbSnpsFile.write("\n")

