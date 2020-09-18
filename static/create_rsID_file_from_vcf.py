import requests
import myvariant
import vcf

sample = open('../shorterVcfSingleSamp.txt', 'w') 

vcf_reader = vcf.Reader(open("../shorterVcfSingleSamp.vcf", "r"))
mv = myvariant.MyVariantInfo()

fileLines = []
for record in vcf_reader:
    chrom = record.CHROM
    pos = record.POS
    ref = record.REF
    alt = record.ALT[0]
    varString = "chr{0}:g.{1}{2}>{3}".format(chrom, pos, ref, alt)
    snp = mv.getvariant(varString, fields='dbsnp.rsid')
    if (snp is not None):
        if ('dbsnp' in snp.keys()):
            snp = snp['dbsnp']['rsid']
        else:
            print(snp)
    else:
        print(chrom, pos, ref, alt)

    for call in record.samples:  
        gt = call.gt_bases    
        name = call.sample 
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