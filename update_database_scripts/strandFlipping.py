import myvariant
import contextlib, io

import os
from os import listdir
from os.path import isfile, join
from sys import argv

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
        continue

    return alleles


def getComplement(allele):
    complements = {
        'G': 'C',
        'C': 'G',
        'A': 'T',
        'T': 'A'
    }
    return(complements[allele])


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

        riskAllele = line[9]
        if riskAllele not in possibleAlleles and len(riskAllele) == 1:
            complement = getComplement(riskAllele)
            if complement in possibleAlleles:
                line[9] = complement
                print("WE MADE A SWITCH", rsID, riskAllele, complement)
        
        content[i] = '\t'.join(line)


    associFile.close()
    associFile = open(associationTableFolderPath, 'w')

    associFile.write(''.join(content))
    associFile.close()




if __name__ == "__main__":
    main()
