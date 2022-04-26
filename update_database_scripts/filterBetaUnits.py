from sys import argv
from os import path

# Studies should have the beta unit for all associations that have the same trait/pValAnno/betaAnno/valType/studyID
# combination. When they don't (either due to spelling errors in the beta unit column or otherwise), this script
# removes those associations and prints out the number of associations removed as well as the studies affected.
# How to run: python3 filterBetaUnits.py "associationTableFolderPath"
# where: "associationTableFolderPath" is the path to the folder where the associations table is stored

# expected columns of the associations table and their indicies
# id	snp	hg38	hg19	hg18	hg17	trait	gene	raf	riskAllele	pValue	pValueAnnotation	oddsRatio	lowerCI	upperCI	betaValue	betaUnit	betaAnnotation	ogValueTypes	sex	numAssociationsFiltered	citation	studyID
# 0     1   2       3       4       5       6       7       8   9           10      11                  12          13      14      15          16          17              18              19  20                      21          22

associationTableFolderPath = argv[1] if len(argv) > 1 else "../tables/"
associationsTablePath = path.join(associationTableFolderPath, "associations_table.tsv")


# get the unique groupings of associations and store them in uniqueGroups

uniqueGroups = {}

totalSNPs = 0
with open(associationsTablePath, "r", encoding="utf-8") as file:
    header = file.readline()
    for line in file:
        lineItems = line.strip().split("\t")
        id = lineItems[0]
        trait = lineItems[6]
        pValueAnnotation = lineItems[11]
        betaAnnotation = lineItems[17]
        ogValueTypes = lineItems[18]
        studyID = lineItems[22]
        betaUnit = lineItems[16].lower()
        group = "|".join([trait, pValueAnnotation, betaAnnotation, ogValueTypes, studyID])
        if group not in uniqueGroups:
            uniqueGroups[group] = {betaUnit:[id]}
        else:
            if betaUnit not in uniqueGroups[group]:
                uniqueGroups[group][betaUnit] = [id]
            else:
                uniqueGroups[group][betaUnit].append(id)
        totalSNPs += 1

# save the ids of the unique groupings that have more than 1 beta unit for the grouping 
numSNPsToRemove = 0
idsToRemove = []
for group, groupBetaUnits in uniqueGroups.items():
    if len(groupBetaUnits) > 1:
        for unit, ids in groupBetaUnits.items():
            for id in ids:
                idsToRemove.append(id)
                numSNPsToRemove += 1

print(totalSNPs, "-", numSNPsToRemove, "=", totalSNPs-numSNPsToRemove)

# print out the new associations table with the necessary ids removed and the id column shifted appropriately
studiesAltered = set()
numLinesRemoved = 0
with open(associationsTablePath, "r", encoding="utf-8") as infile:
    lines = infile.readlines()
with open(associationsTablePath, "w", encoding="utf=8") as outFile:
    header = True
    lineNum = 0
    for line in lines:
        if header:
            outFile.write(line)
            header = False
        else:
            lineItems = line.strip().split("\t")
            id = lineItems[0]
            if id not in idsToRemove:
                lineItems[0] = str(lineNum)
                line = "\t".join(lineItems) + "\n"
                outFile.write(line)
                lineNum += 1
            else:
                studyID = lineItems[22]
                studiesAltered.add(studyID)
                numLinesRemoved += 1

print("Lines removed:", numLinesRemoved)
print("Studies altered:", len(studiesAltered))
print(sorted(studiesAltered))