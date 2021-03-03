import json
import vcf
import calculate_score as cs
import time
import sys
import os
import os.path
from collections import defaultdict


def parse_files(inputFilePath, fileHash, requiredParamsHash, superPop, refGen, defaultSex, pValue, extension, outputFilePath, outputType, isCondensedFormat, timestamp):
    # tells us if we were passed rsIDs or a vcf
    isRSids = True if extension.lower().endswith(".txt") or inputFilePath.lower().endswith(".txt") else False

    # Access the clumpsObjDict
    tableObjDict, clumpsObjDict, clumpNumDict, studySnpsDict, filteredInputPath = getDownloadedFiles(fileHash, requiredParamsHash, superPop, refGen, defaultSex, isRSids, timestamp)
    
    # Determine whether the output foramt is condensed and either json or tsv
    if outputType == '.json':
        isJson = True
        isCondensedFormat = False
    else:
        isJson = False
        if isCondensedFormat == '0':
            isCondensedFormat = False
        else:
            isCondensedFormat = True

    # Loop through each (trait, study) and perform the parsing and calculations
    isFirstUsed = True
    isFirstUnused = True
    for keyString in studySnpsDict:
        trait = keyString.split('|')[0]
        study = keyString.split('|')[1]
        snpSet = studySnpsDict[keyString]
        if isRSids: #TODO: do this for txt files
            txtObj, clumpedVariants, unmatchedAlleleVariants, unusedTraitStudy= parse_txt(filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study)
            isFirstUsed, isFirstUnused = cs.calculateScore(snpSet, txtObj, tableObjDict, isJson, isCondensedFormat, unmatchedAlleleVariants, clumpedVariants, outputFilePath, None, unusedTraitStudy, trait, study, isFirstUsed, isFirstUnused, isRSids)
        else:
            vcfObj, neutral_snps_map, clumped_snps_map, sample_num, unusedTraitStudy= parse_vcf(filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study)
            isFirstUsed, isFirstUnused = cs.calculateScore(snpSet, vcfObj, tableObjDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, study, isFirstUsed, isFirstUnused, isRSids)
    return


def getDownloadedFiles(fileHash, requiredParamsHash, superPop, refGen, sex, isRSids, timestamp):
    #TODO: check on when to use ahash and when to not
    basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    specificAssociPath = os.path.join(basePath, "associations_{ahash}.txt".format(ahash = fileHash))
    # get the paths for the associationsFile and clumpsFile
    if (fileHash == requiredParamsHash or not os.path.isfile(specificAssociPath)):
        associationsPath = os.path.join(basePath, "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=sex[0]))
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}.txt".format(p = superPop, r = refGen))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps.txt")
        filteredInputPath = associationsPath
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}.txt".format(r=refGen))
    else:
        associationsPath = specificAssociPath
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps_{ahash}.txt".format(ahash=fileHash))
        filteredInputPath = os.path.join(basePath, "filteredInput_{uniq}.txt".format(uniq = timestamp)) if isRSids else os.path.join(basePath, "filteredInput_{uniq}.vcf".format(uniq = timestamp))
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}_{ahash}.txt".format(r = refGen, ahash = fileHash))

    try:
        with open(associationsPath, 'r') as tableObjFile:
            tableObjDict = json.load(tableObjFile)
        with open(clumpsPath, 'r') as clumpsObjFile:
            clumpsObjDict = json.load(clumpsObjFile)
        with open(clumpNumPath, 'r') as clumpNumFile:
            clumpNumDict = json.load(clumpNumFile)
        with open(studySnpsPath, 'r') as studySnpsFile:
            studySnpsDict = json.load(studySnpsFile)
    
    except FileNotFoundError:
        raise SystemExit("ERROR: One or both of the required working files could not be found. \n Paths searched for: \n{0}\n{1}\n{2}\n{3}".format(associationsPath, clumpsPath, clumpNumPath, studySnpsPath))

    return tableObjDict, clumpsObjDict, clumpNumDict, studySnpsDict, filteredInputPath


def formatAndReturnGenotype(genotype, REF, ALT):
    try:
        if genotype != "./." and genotype != ".|." and genotype !=".." and genotype != '.':
            count = 0
            alleles = []
            if "|" in genotype:
                gt_nums = genotype.split('|')
                if gt_nums[0] == ".":
                    count = 1
                elif gt_nums[1] == ".":
                    count = 2
                if count == 0:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
                elif count == 1:
                    alleles.append("")
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
                elif count == 2:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    alleles.append("")
                    
            elif "/" in genotype:
                gt_nums = genotype.split('/')
                if gt_nums[0] == ".":
                    count = 1
                elif gt_nums[1] == ".":
                    count = 2
                if count == 0:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
                elif count == 1:
                    alleles.append("")
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
                elif count == 2:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    alleles.append("")

            else:
                gt_nums = list(genotype)
                if gt_nums[0] == ".":
                    count = 1
                elif gt_nums[1] == ".":
                    count = 2
                if count == 0:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
                elif count == 1:
                    alleles.append("")
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
                elif count == 2:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    alleles.append("")
                
        else:
            alleles = ""

    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    return alleles


def parse_txt(filteredFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, p_cutOff, trait, study):
    # open filtered file
    lines = open(filteredFilePath, 'r')

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # create dictionaries to store the variants not used in the calculations
    clumpedVariants= set()
    unmatchedAlleleVariants = set()

    # create boolean to keep track of whether this study/trait has an snps in the vcf
    unusedTraitStudy = True

    # Iterate through each record in the file and save the SNP rs ID
    for line in lines:
        # remove all whitespace from line
        line = "".join(line.split())

        # initialize variables
        snp = ""
        alleles = []

        try:
            # if the line isn't empty or commented out
            if line != "" and not line.startswith("#") and not line.startswith("//"):
                line = line.strip() #line should be in format of rsID:Genotype,Genotype
                snp, alleles = line.split(':')
                allele1, allele2 = alleles.split(',')
                alleles = [allele1.upper(), allele2.upper()]
            else:
                continue
        except ValueError:
            raise SystemExit("ERROR: Some lines in the filtered input file are not formatted correctly. " +
                "Please ensure that all lines are formatted correctly (rsID:Genotype,Genotype)\n" +
                "Offending line:\n" + line)
        
        if alleles != [] and snp != "":
            # check if the snp is found in this study/trait
            if snp in snpSet:
                # boolean to keep track of whether there were viable snps for this study
                unusedTraitStudy = False
                # grab the corresponding pvalue, risk allele, and odds ratio
                pValue = tableObjDict['associations'][snp]['traits'][trait][study]['pValue']
                riskAllele = tableObjDict['associations'][snp]['traits'][trait][study]['riskAllele']

                #compare the pvalue to the threshold
                if pValue <= float(p_cutOff):

                    if riskAllele in alleles:
                        # Check to see if the snp position from this line in the file exists in the clump table
                        if snp in clumpsObjDict:
                            # Grab the clump number associated with this snp 
                            clumpNum = str(clumpsObjDict[snp]['clumpNum'])
                            clumpNumTotal = clumpNumDict[clumpNum]

                            if clumpNumTotal > 0:
                                # Check whether the existing index snp or current snp have a lower pvalue for this study
                                # and switch out the data accordingly
                                if clumpNum in index_snp_map:
                                    index_snp, index_alleles = index_snp_map[clumpNum]
                                    index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][studyID]['pValue']

                                    if pValue < index_pvalue:
                                        index_snp_map[clumpNum] = snp, alleles
                                        # The snps that aren't index snps will be considered neutral snps
                                        clumpedVariants.add(index_snp)
                                    else:
                                        clumpedVariants.add(snp)
                                else:
                                    # Since the clump number for this snp position and studyID
                                    # doesn't already exist, add it to the index map and the sample map
                                    index_snp_map[clumpNum] = snp, alleles
                            else:
                                # the variant is the only one in the ld clump
                                sample_map[snp] = alleles
                        # The snp wasn't in the clump map (meaning it wasn't in 1000 Genomes), so add it
                        else:
                            sample_map[snp] = alleles
                    else:
                        unmatchedAlleleVariants.add(snp)

    for clumpNum in index_snp_map:
        snp, alleles = index_snp_map[clumpNum]
        sample_map[snp] = alleles

    final_map = dict(sample_map)
    return final_map, clumpedVariants, unmatchedAlleleVariants, unusedTraitStudy


def parse_vcf(filteredFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, p_cutOff, trait, study):
    # Open filtered file
    vcf_reader = vcf.Reader(open(filteredFilePath, 'r'))

    # Create a dictionary to keep track of the variants in each study
    sample_map = defaultdict(dict)

    # Create a nested dictionary with sample name, clump num, index snp to keep track of the clumps for each sample's variants
    index_snp_map = defaultdict(dict)

    # Create dictionaries to store the variants not used in the calculations
    neutral_snps_map = {}
    clumped_snps_map = {}

    # Get the number of samples in the vcf
    sample_num = len(vcf_reader.samples)

    # Create sets to keep track of which samples have a viable snp for this trait/study
    no_viable_snp_counter = set()
    viable_snp_counter = set()

    # Create variables to keep track of whether this trait/study has any snps that are used
    unusedTraitStudy = True

    try:
        # Iterate through each line in the vcf file
        for record in vcf_reader:
            string_format = str(record.FORMAT)
            rsID = record.ID
            chromPos = str(record.CHROM) + ":" + str(record.POS)
            if (chromPos in tableObjDict['associations'] and (rsID is None or rsID not in tableObjDict['associations'])):
                rsID = tableObjDict['associations'][chromPos]
            ALT = record.ALT
            REF = record.REF 

            # check if the snp is found in this study/trait
            if rsID in snpSet:
                unusedTraitStudy = False
                #grab the corresponding pvalue, risk allele, and odds ratio
                pValue = tableObjDict['associations'][rsID]['traits'][trait][study]['pValue']
                riskAllele = tableObjDict['associations'][rsID]['traits'][trait][study]['riskAllele']
                oddsRatio = tableObjDict['associations'][rsID]['traits'][trait][study]['oddsRatio']

                # comparethe pvalue to the pvalue cutoff
                if pValue <= float(p_cutOff):
                    # loop through each sample of the vcf file
                    for call in record.samples:
                        sample = call.sample
                        genotype = record.genotype(sample)['GT']
                        alleles = formatAndReturnGenotype(genotype, REF, ALT)

                        # Grab or create maps that hold sets of unused variants
                        clumpedVariants = clumped_snps_map[sample] if sample in clumped_snps_map else set()
                        unmatchedAlleleVariants = neutral_snps_map[sample] if sample in neutral_snps_map else set()

                        if riskAllele in alleles:
                            # keep track of whether this sample has any viable snps for this study
                            if sample in no_viable_snp_counter:
                                no_viable_snp_counter.remove(sample)
                            viable_snp_counter.add(sample)

                            if rsID in clumpsObjDict:
                                # Grab the clump number associated with this study and snp position
                                clumpNum = str(clumpsObjDict[rsID]['clumpNum'])
                                clumpNumTotal = clumpNumDict[clumpNum]

                                if clumpNumTotal > 0:
                                    if sample in index_snp_map:
                                        # if the clump number for this snp position and study/name is already in the index map, move forward
                                        if clumpNum in index_snp_map[sample]:
                                            index_snp, index_alleles = index_snp_map[sample][clumpNum]
                                            index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study]['pValue']

                                            # Check whether the existing index snp or current snp have a lower pvalue for this study
                                            # and switch out the data accordingly
                                            if pValue < index_pvalue:
                                                index_snp_map[sample][clumpNum] = rsID, alleles
                                                clumpedVariants.add(index_snp)
                                            else:
                                                if index_alleles == "":
                                                    index_snp_map[sample][clumpNum] = rsID, alleles
                                                    clumpedVariants.add(index_snp)
                                                else:
                                                    clumpedVariants.add(rsID)
                                        else:
                                            # Since the clump number for this snp position and study/name
                                            # doesn't already exist, add it to the index map and the sample map
                                            index_snp_map[sample][clumpNum] = rsID, alleles
                                    else:
                                        # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                                        index_snp_map[sample][clumpNum] = rsID, alleles
                                # the variant is the only one in the ld clump
                                else:
                                    sample_map[sample][rsID] = alleles
                            # the variant isn't in the clump tables
                            else:
                                sample_map[sample][rsID] = alleles
                        # the sample's alleles don't include the risk allele
                        else:
                            if sample not in viable_snp_counter:
                                no_viable_snp_counter.add(sample)
                            unmatchedAlleleVariants.add(rsID)

                        clumped_snps_map[sample] = clumpedVariants
                        neutral_snps_map[sample] = unmatchedAlleleVariants

        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        for sample in no_viable_snp_counter:
            sample_map[sample][""] = ""

        # Add the index snp for each sample's ld clump to the sample map
        for sample in index_snp_map:
                for clumpNum in index_snp_map[sample]:
                    rsID, alleles = index_snp_map[sample][clumpNum]
                    sample_map[sample][rsID] = alleles

    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    final_map = dict(sample_map)
    no_viable_snp_counter = set()
    viable_snp_counter = set()
    vcf_reader = None
    return final_map, neutral_snps_map, clumped_snps_map, sample_num, unusedTraitStudy


