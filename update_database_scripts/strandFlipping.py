from re import A
import myvariant
import contextlib, io
from sys import argv
from Bio.Seq import Seq
import json

# This script performs strand flipping on the associations_table.tsv. For each line in the associations file, the script grabs information about
# viable alleles for the variant. The riskAllele is checked against this list to see if the riskAllele needs to be flipped to its complement
#
# How to run: python3 strandFlipping.py "associationTableFolderPath" "writeOrAppendToFlippedFile"
# where: "associationTableFolderPath" is the path to the associations_table.tsv (default: "../tables")


def createPossibleAlleles(queryObjs):
    possibleAllelesObj = {}
    if queryObjs is not None:
        for obj in queryObjs:
            alleles = set()
            snp = obj['query']
            # print(snp, obj)
            if 'notfound' not in obj:
                if ('alleles' in obj['dbsnp']): 
                    for alleleObj in obj['dbsnp']['alleles']:
                        alleles.add(alleleObj['allele'])
                if ('ref' in obj['dbsnp'] and obj['dbsnp']['ref'] != ""):
                    alleles.add(obj['dbsnp']['ref'])
                if ('alt' in obj['dbsnp'] and obj['dbsnp']['alt'] != ""):
                    alleles.add(obj['dbsnp']['alt'])
                if (len(alleles) == 0):
                    print(obj, "STILL NO ALLELES")
                if snp not in possibleAllelesObj:
                    possibleAllelesObj[snp] =  list(alleles)
                else:
                    tmpAlleles = set(possibleAllelesObj[snp])
                    possibleAllelesObj[snp] = list(tmpAlleles | alleles)
    else:
        SystemExit("query Objs was empty!!! PROBLEM")
    return possibleAllelesObj


def getVariantAlleles(rsID, mv):
    f=io.StringIO()
    with contextlib.redirect_stdout(f):
        queryResult = mv.query('dbsnp.rsid:{}'.format(rsID), fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref')
    output = f.getvalue()

    objs = queryResult['hits'] if len(queryResult['hits']) > 0 else None


    alleles = set()
    if objs is not None:
        for obj in objs:
            if ('alleles' in obj['dbsnp']): 
                for alleleObj in obj['dbsnp']['alleles']:
                    alleles.add(alleleObj['allele'])
            if ('ref' in obj['dbsnp'] and obj['dbsnp']['ref'] != ""):
                alleles.add(obj['dbsnp']['ref'])
            if ('alt' in obj['dbsnp'] and obj['dbsnp']['alt'] != ""):
                alleles.add(obj['dbsnp']['alt'])
            if (len(alleles) == 0):
                print(obj, "STILL NO ALLELES")
    else:
        # TODO maybe: try to find it with a merged snp?
        pass

    return alleles


def main():
    associationTableFolderPath = "../tables/associations_table.tsv"
    fileView = 'a'

    if len(argv) >= 2:
        associationTableFolderPath = "{}/associations_table.tsv".format(argv[1])
    if len(argv) == 3:
        fileView = 'w'

    mv = myvariant.MyVariantInfo()
    associFile = open(associationTableFolderPath, 'r', encoding='utf-8')
    content = associFile.readlines()
    strandFlipped = open("flipped.tsv", fileView)
    snpSet = set()
    
    for i in range(1,len(content)):
        line = content[i].strip().split('\t')
        rsID = line[1]
        snpSet.add(rsID)

    queryResults = mv.querymany(list(snpSet), scopes='dbsnp.rsid', fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref')
    possibleAllelesDict = createPossibleAlleles(queryResults)

    for i in range(1,len(content)):
        line = content[i].strip().split('\t')
        rsID = line[1]
        studyID = line[-1]
        trait = line[6]
        pValAnno = line[11]
        betaAnno = line[17]
        ogValueType = line[18]

        # possibleAlleles = getVariantAlleles(rsID, mv)
        riskAllele = Seq(line[9])
        if rsID in possibleAllelesDict and riskAllele not in possibleAllelesDict[rsID]:
            complement = riskAllele.reverse_complement()
            if complement in possibleAllelesDict[rsID]:
                line[9] = str(complement)
                strandFlipped.write("{0}\t{1}\t{2}\t{3}\t{4}\t{5}\t{6}\t{7}\n".format(rsID, riskAllele, complement, trait, pValAnno, betaAnno, ogValueType, studyID))
                print("WE MADE A SWITCH", rsID, riskAllele, complement)

        content[i] = '\t'.join(line) + "\n"

    associFile.close()
    strandFlipped.close()
    associFile = open(associationTableFolderPath, 'w', encoding='utf-8')
    associFile.write(''.join(content))
    associFile.close()
    possibleAllelesFile = open('../static/downloadables/preppedServerFiles/allPossibleAlleles.txt', 'w', encoding='utf-8')
    possibleAllelesFile.write(json.dumps(possibleAllelesDict))
    possibleAllelesFile.close()

    print("Finished strand flipping")


if __name__ == "__main__":
    main()
