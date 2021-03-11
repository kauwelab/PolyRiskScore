from multiprocessing import Pool
import json
import vcf
import calculate_score as cs
import time
import sys
import os
import os.path
from collections import defaultdict

def parseAndCalculateFiles(params):
    inputFilePath = params[0]
    clumpsObjDict = params[1]
    tableObjDict  = params[2]
    snpSet = params[3]
    clumpNumDict = params[4]
    pValue = params[5]
    trait = params[6]
    study = params[7]
    isJson = params[8]
    isCondensedFormat = params[9]
    outputFilePath = params[10]
    isRSids = params[11]
    timestamp = params[12]

    if isRSids: 
        txtObj, clumpedVariants, unmatchedAlleleVariants, unusedTraitStudy = parse_txt(inputFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study)
        cs.calculateScore(snpSet, txtObj, tableObjDict, isJson, isCondensedFormat, unmatchedAlleleVariants, clumpedVariants, outputFilePath, None, unusedTraitStudy, trait, study, isRSids, None)
    else:
        vcfObj, neutral_snps_map, clumped_snps_map, sample_num, unusedTraitStudy, sample_order = parse_vcf(inputFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study, timestamp)
        cs.calculateScore(snpSet, vcfObj, tableObjDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, study, isRSids, sample_order)

    return


def getDownloadedFiles(fileHash, requiredParamsHash, superPop, refGen, sex, isRSids, timestamp):
    basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    specificAssociPath = os.path.join(basePath, "associations_{ahash}.txt".format(ahash = fileHash))
    # get the paths for the associationsFile and clumpsFile
    if (fileHash == requiredParamsHash or not os.path.isfile(specificAssociPath)):
        associationsPath = os.path.join(basePath, "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=sex[0]))
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}.txt".format(p = superPop, r = refGen))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps.txt")
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}.txt".format(r=refGen))
    else:
        associationsPath = specificAssociPath
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps_{ahash}.txt".format(ahash=fileHash))
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}_{ahash}.txt".format(r = refGen, ahash = fileHash))

    filteredInputPath = os.path.join(basePath, "filteredInput_{uniq}.txt".format(uniq = timestamp)) if isRSids else os.path.join(basePath, "filteredInput_{uniq}.vcf".format(uniq = timestamp))

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
    
    # Create a dictionary with clump number and index snp to keep track of the variant with the lowest pvalue in each ld region
    index_snp_map = {}

    # create dictionaries to store the variants not used in the calculations
    clumpedVariants= set()
    unmatchedAlleleVariants = set()

    # create boolean to keep track of whether this study/trait has any snps in the vcf
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
                # boolean to keep track of whether there were viable snps for this study.
                unusedTraitStudy = False
                # grab the corresponding pvalue and risk allele
                pValue = tableObjDict['associations'][snp]['traits'][trait][study]['pValue']
                riskAllele = tableObjDict['associations'][snp]['traits'][trait][study]['riskAllele']

                #compare the pvalue to the threshold
                if pValue <= float(p_cutOff):

                    if riskAllele in alleles:
                        # Check to see if the snp position from this line in the file exists in the clump table
                        if snp in clumpsObjDict:
                            # Grab the clump number associated with this snp 
                            clumpNum = str(clumpsObjDict[snp]['clumpNum'])
                            # check to see the number of variants in this ld clump. If the snp is the only one in the clump, we skip the clumping checks
                            clumpNumTotal = clumpNumDict[clumpNum]

                            if clumpNumTotal > 0:
                                # If this snp is in LD with any other snps, check whether the existing index snp or current snp have a lower pvalue 
                                if clumpNum in index_snp_map:
                                    index_snp, index_alleles = index_snp_map[clumpNum]
                                    index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study]['pValue']

                                    if pValue < index_pvalue:
                                        index_snp_map[clumpNum] = snp, alleles
                                        # The snps that aren't index snps will be considered neutral snps
                                        clumpedVariants.add(index_snp)
                                    else:
                                        clumpedVariants.add(snp)
                                else:
                                    # Since the clump number for this snp position and studyID
                                    # doesn't already exist, add it to the index map
                                    index_snp_map[clumpNum] = snp, alleles
                            else:
                                # the variant is the only one in the ld clump
                                sample_map[snp] = alleles
                        # The snp wasn't in the clump map (meaning it wasn't in 1000 Genomes), so add it
                        else:
                            sample_map[snp] = alleles
                    else:
                        # the risk allele wasn't in the listed alleles
                        unmatchedAlleleVariants.add(snp)
    # loop through each LD clump and add the index snp to the final sample map
    for clumpNum in index_snp_map:
        snp, alleles = index_snp_map[clumpNum]
        sample_map[snp] = alleles

    final_map = dict(sample_map)
    return final_map, clumpedVariants, unmatchedAlleleVariants, unusedTraitStudy


def parse_vcf(filteredFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, p_cutOff, trait, study, timestamp):
    # create a temp file that will hold the lines of snps found in this trait/study
    basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    tempFilePath = os.path.join(basePath, "{t}_{s}_{uniq}.vcf".format(t=trait.replace('/','-'), s=study, uniq = timestamp))
    with open(tempFilePath, 'w') as w:
        # Open filtered file
        with open(filteredFilePath, 'r') as f:
            # create counter to keep track of how many snps from the study are in this input file
            snpCount = 0
            for line in f:
                # check if the line is a header
                if line[0] == '#':
                    w.write(line)
                else:
                    # cut the line and get the column values
                    shortLine = line[0:500]
                    cols = shortLine.split('\t')
                    rsID = cols[2]
                    chromPos = str(cols[0]) + ":" + str(cols[1])
                    if (chromPos in tableObjDict['associations'] and (rsID is None or rsID not in tableObjDict['associations'])):
                        rsID = tableObjDict['associations'][chromPos]

                    # if the rsid is in the study/trait, write the line to the temp file
                    if rsID in snpSet:
                        w.write(line)
                        snpCount += 1

    # Create a dictionary to keep track of the variants in each study
    sample_map = defaultdict(dict)

    # Create a dictionary with clump number and index snps to keep track of the index snp for each LD region
    index_snp_map = defaultdict(dict)

    # Create dictionaries to store the variants not used in the calculations for each sample
    neutral_snps_map = {}
    clumped_snps_map = {}

    # open the tempFile as a vcf reader now
    vcf_reader = vcf.Reader(open(tempFilePath, 'r'))

    # Get the number of samples in the vcf
    sampleOrder = vcf_reader.samples
    sample_num = len(sampleOrder)

    # Create sets to keep track of which samples have a viable snp for this trait/study
    no_viable_snp_counter = set()
    viable_snp_counter = set()

    # Create variables to keep track of whether this trait/study has any snps that are used
    if snpCount == 0:
        unusedTraitStudy = True
        if os.path.exists(tempFilePath):
            # delete the vcf_reader so when we go to remove the tempFilePath, we don't get an error that the file is open
            del vcf_reader
            os.remove(tempFilePath)
        return sample_map, neutral_snps_map, clumped_snps_map, sample_num, unusedTraitStudy, sampleOrder
    else:
        unusedTraitStudy = False


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

            #grab the corresponding pvalue and risk allele
            pValue = tableObjDict['associations'][rsID]['traits'][trait][study]['pValue']
            riskAllele = tableObjDict['associations'][rsID]['traits'][trait][study]['riskAllele']

            # compare the pvalue to the pvalue cutoff
            if pValue <= float(p_cutOff):
                # loop through each sample of the vcf file
                for call in record.samples:
                    sample = call.sample
                    genotype = record.genotype(sample)['GT']
                    alleles = formatAndReturnGenotype(genotype, REF, ALT)

                    # Grab or create maps that hold sets of unused variants for this sample
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
                            # Check to see how many variants are in this clump. If there's only one, we can skip the clumping checks.
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

    #remove temp file
    if os.path.exists(tempFilePath):
        os.remove(tempFilePath)

    return final_map, neutral_snps_map, clumped_snps_map, sample_num, unusedTraitStudy, sampleOrder


def getSamples(inputFilePath, header):
    # Open filtered file
    vcf_reader = vcf.Reader(open(inputFilePath, 'r'))
    samples = vcf_reader.samples
    header.extend(samples)
    return header

def runParsingAndCalculations(inputFilePath, fileHash, requiredParamsHash, superPop, refGen, defaultSex, pValue, extension, outputFilePath, outputType, isCondensedFormat, timestamp, num_processes):
    paramOpts = []
    if num_processes == "":
        num_processes = None
    else:
        num_processes = int(num_processes)
    print(num_processes)
    
    # tells us if we were passed rsIDs or a vcf
    isRSids = True if extension.lower().endswith(".txt") or inputFilePath.lower().endswith(".txt") else False

    # Access the downloaded files and paths
    tableObjDict, clumpsObjDict, clumpNumDict, studySnpsDict, filteredInputPath = getDownloadedFiles(fileHash, requiredParamsHash, superPop, refGen, defaultSex, isRSids, timestamp)
    
    # Determine whether the output format is condensed and either json or tsv
    if outputType == '.json':
        isJson = True
        isCondensedFormat = False
    else:
        isJson = False
        if isCondensedFormat == '0':
            isCondensedFormat = False
        else:
            isCondensedFormat = True

    
    if isJson: #json and verbose
        # we need to run through one iteration here so that we know the first json result has the opening list bracket
        key = next(iter(studySnpsDict))
        trait = key.split("|")[0]
        study = key.split("|")[1]
        snpSet = studySnpsDict[key]
        params = (filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study, isJson, isCondensedFormat, outputFilePath, isRSids, timestamp)
        # we need to make sure the outputFile doesn't already exist so that we don't append to an old file
        if os.path.exists(outputFilePath):
            os.remove(outputFilePath)
        parseAndCalculateFiles(params)
            # remove the key value pair from the dictinoary so that it's not written to the output file twice (see below)
        del studySnpsDict[key]
    else:
        # we need to write out the header depending on the output type
        header = []
        if isCondensedFormat and isRSids: # condensed and txt input
            header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Citation', 'Polygenic Risk Score']
        elif isCondensedFormat: # condensed and vcf input
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation']
            # loop through each sample and add to the header
            header = getSamples(filteredInputPath, header)
        elif not isCondensedFormat  and isRSids: # verbose and txt input
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
        else: # verbose and vcf input
            header = ['Sample', 'Study ID', 'Reported Trait', 'Trait', 'Citation', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
        cs.formatTSV(True, None, header, outputFilePath)

    # we create params for each study so that we can run them on separate processes
    for keyString in studySnpsDict:
        trait = keyString.split('|')[0]
        study = keyString.split('|')[1]
        # get all of the variants associated with this trait/study
        snpSet = studySnpsDict[keyString]
        paramOpts.append((filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study, isJson, isCondensedFormat, outputFilePath, isRSids, timestamp))
        # if no subprocesses are going to be used, run the calculations once for each study/trait
        if num_processes == 0:
            parseAndCalculateFiles((filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, pValue, trait, study, isJson, isCondensedFormat, outputFilePath, isRSids, timestamp))


    if num_processes is None or (num_processes is int and num_processes > 0):
        with Pool(processes=num_processes) as pool:
            pool.map(parseAndCalculateFiles, paramOpts)
