import vcf
import sys
from sys import argv
import os

# name of sample output vcf
sampleFileName = argv[1] if len(sys.argv) > 1 else "sample"
# path to sample output vcf folder
sampleVCFFolderPath = argv[2] if len(sys.argv) > 2 else "../static/"
# combine path and vcf name
sampleVCFPath = os.path.join(sampleVCFFolderPath, sampleFileName + ".vcf")
sampleTXTPath = os.path.join(sampleVCFFolderPath, sampleFileName + ".txt")

sample = open(sampleTXTPath, 'w') 

vcf_reader = vcf.Reader(open(sampleVCFPath, "r"))

fileLines = []
for record in vcf_reader:
    snp = record.ID
    ref = record.REF
    alt = record.ALT[0]

    # for call in record.samples:  
    gt = record.samples[0].gt_bases    
    name = record.samples[0].sample 
    genotype = record.genotype(name)['GT']
    alleles = []

    # Check whether the genotype for this sample and snp exists
    if genotype != "./.":
        count = 0
        if "|" in genotype:
            gt_nums = genotype.split('|')
            if gt_nums[0] == ".":
                count = 1
            elif gt_nums[1] == ".":
                count = 2
            if count == 0:
                alleles = gt.split('|')
            elif count == 1:
                alleles.append("")
                if gt_nums[1] == 0:
                    alleles.append(ref)
                elif gt_nums[1] == 1:
                    alleles.append(alt)
            elif count == 2:
                if gt_nums[0] == 0:
                    alleles.append(ref)
                elif gt_nums[1] == 1:
                    alleles.append(alt)
                alleles.append("")
                
        elif "/" in genotype:
            gt_nums = genotype.split('/')
            if gt_nums[0] == ".":
                count = 1
            elif gt_nums[1] == ".":
                count = 2
            if count == 0:
                alleles = gt.split('/')
            elif count == 1:
                alleles.append("")
                if gt_nums[1] == '0':
                    alleles.append(ref)
                elif gt_nums[1] == '1':
                    alleles.append(alt)
            elif count == 2:
                if gt_nums[0] == 0:
                    alleles.append(ref)
                elif gt_nums[1] == 1:
                    alleles.append(alt)
                alleles.append("")

        else:
            gt_nums = list(genotype)
            if gt_nums[0] == ".":
                count = 1
            elif gt_nums[1] == ".":
                count = 2
            if count == 0:
                alleles = list(gt)
            elif count == 1:
                alleles.append("")
                if gt_nums[1] == 0:
                    alleles.append(ref)
                elif gt_nums[1] == 1:
                    alleles.append(alt)
            elif count == 2:
                if gt_nums[0] == 0:
                    alleles.append(ref)
                elif gt_nums[1] == 1:
                    alleles.append(alt)
                alleles.append("")
    else:
        alleles.append("")
        alleles.append("")
        
    alleles = ",".join(alleles)   
    fileLines.append("{0}:{1}".format(snp,alleles))
    print("{0}:{1}".format(snp,alleles), file = sample)

sample.close()

print("Finished creating sample rsID file from VCF")
