import myvariant
import contextlib, io
import os
from os import listdir
from os.path import isfile, join
from sys import argv
from Bio.Seq import Seq

# This script performs strand flipping on the associations_table.tsv. For each line in the associations file, the script grabs information about
# viable alleles for the variant. The riskAllele is checked against this list to see if the riskAllele needs to be flipped to its complement
#
# How to run: python3 strandFlipping.py "associationTableFolderPath"
# where: "associationTableFolderPath" is the path to the associations_table.tsv (default: "../tables")


def getVariantAlleles(rsID, mv):
    f=io.StringIO()
    with contextlib.redirect_stdout(f):
        queryResult = mv.query('dbsnp.rsid:{}'.format(rsID), fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref')
    output = f.getvalue()

    obj = queryResult['hits'][0] if len(queryResult['hits']) > 0 else None

    alleles = set()
    if obj is not None:
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

    if len(argv) == 2:
        associationTableFolderPath = "{}/associations_table.tsv".format(argv[1])

    mv = myvariant.MyVariantInfo()
    associFile = open(associationTableFolderPath, 'r')
    content = associFile.readlines()

    for i in range(1,len(content)):
        line = content[i].split('\t')
        rsID = line[1]
        possibleAlleles = getVariantAlleles(rsID, mv)
        riskAllele = Seq(line[9])
        if riskAllele not in possibleAlleles:
            complement = riskAllele.reverse_complement()
            if complement in possibleAlleles:
                line[9] = str(complement)
                print("WE MADE A SWITCH", rsID, riskAllele, complement)

        content[i] = '\t'.join(line)

    associFile.close()
    associFile = open(associationTableFolderPath, 'w')
    associFile.write(''.join(content))
    associFile.close()

    print("Finished strand flipping")


if __name__ == "__main__":
    main()
