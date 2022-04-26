from multiprocessing import Pool
from io import StringIO
import json
from Bio.Seq import reverse_complement
import vcf
import calculate_score as cs
import sys
import os
import os.path
from collections import defaultdict
import hashlib
from connect_to_server import getPreferredPop, formatMafCohort

def parseAndCalculateFiles(params):
    # initialize the parameters used in multiprocessing
    inputFilePath = params[0]
    clumpsObjDict = params[1]
    tableObjDict  = params[2]
    snpSet = params[3]
    clumpNumDict = params[4]
    possibleAlleles = params[5]
    mafDict = params[6]
    percentileDict = params[7]
    pValue = float(params[8])
    mafCutoff = float(params[9])
    trait = params[10]
    study = params[11]
    pValueAnno = params[12]
    betaAnnotation = params[13]
    valueType = params[14]
    isJson = params[15]
    isCondensedFormat = params[16]
    omitPercentiles = params[17]
    outputFilePath = params[18]
    isRSids = params[19]
    timestamp = params[20]
    isIndividualClump = params[21]
    superPop = params[22]

    # check if the input file is a txt or vcf file
    # parse the file to get the necessary genotype information for each sample and then run the calculations
    if isRSids: 
        txtObj, clumpedVariants, unmatchedAlleleVariants, snpOverlap, excludedSnps, includedSnps, preferredPop = parse_txt(inputFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, mafDict, pValue, mafCutoff, trait, study, pValueAnno, betaAnnotation, valueType, timestamp, isIndividualClump, superPop)
        cs.calculateScore(snpSet, txtObj, tableObjDict, mafDict, percentileDict, isJson, isCondensedFormat, omitPercentiles, unmatchedAlleleVariants, clumpedVariants, outputFilePath, None, trait, study, pValueAnno, betaAnnotation, valueType, isRSids, None, snpOverlap, excludedSnps, includedSnps, preferredPop)
    else:
        vcfObj, mafDict, neutral_snps_map, clumped_snps_map, sample_num, sample_order, snpOverlap, excludedSnps, includedSnps, preferredPop = parse_vcf(inputFilePath, clumpsObjDict, tableObjDict, possibleAlleles, snpSet, clumpNumDict, mafDict, pValue, mafCutoff, trait, study, pValueAnno, betaAnnotation, valueType, timestamp, isIndividualClump, superPop)
        cs.calculateScore(snpSet, vcfObj, tableObjDict, mafDict, percentileDict, isJson, isCondensedFormat, omitPercentiles, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, trait, study, pValueAnno, betaAnnotation, valueType, isRSids, sample_order, snpOverlap, excludedSnps, includedSnps, preferredPop)
    return


def getDownloadedFiles(fileHash, requiredParamsHash, superPop, mafCohort, refGen, isRSids, omitPercentiles, timestamp, useGWASupload):
    isFilters = False
    mafCohort = formatMafCohort(mafCohort)
    percentileCohort = mafCohort
    if mafCohort.startswith("adni"):
        mafCohort = "adni"
    
    basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    specificAssociPath = os.path.join(basePath, "associations_{ahash}.txt".format(ahash = fileHash))
    clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}_{ahash}.txt".format(r=refGen, ahash = fileHash))
    # get the paths for the associationsFile and clumpsFile
    if useGWASupload:
        isFilters=True
        associationsPath = os.path.join(basePath, "GWASassociations_{bhash}.txt".format(bhash = fileHash))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps_{ahash}.txt".format(ahash=fileHash))
        mafCohortPath = os.path.join(basePath, "{m}_maf_{ahash}.txt".format(m=mafCohort, ahash=fileHash))
        if not omitPercentiles:
            percentilePath = os.path.join(basePath, "percentiles_{c}_{ahash}.txt".format(c=percentileCohort, ahash=fileHash))
        possibleAllelesPath = os.path.join(basePath, "possibleAlleles_{ahash}.txt".format(ahash=fileHash))
    elif (fileHash == requiredParamsHash or not os.path.isfile(specificAssociPath)):
        associFileName = "allAssociations_{refGen}.txt".format(refGen=refGen)
        associationsPath = os.path.join(basePath, associFileName)
        filteredStudySnpsPath = os.path.join(basePath, "filteredStudySnps_{ahash}_{uniq}.txt".format(ahash=fileHash, uniq=timestamp))
        if os.path.exists(filteredStudySnpsPath):
            studySnpsPath = filteredStudySnpsPath
        else:
            studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps.txt")
        mafCohortPath = os.path.join(basePath, "{m}_maf_{r}.txt".format(m=mafCohort, r=refGen))
        if not omitPercentiles:
            percentilePath = os.path.join(basePath, "allPercentiles_{m}.txt".format(m=percentileCohort)) 
        possibleAllelesPath = os.path.join(basePath, "allPossibleAlleles.txt".format(ahash=fileHash))
    else:
        isFilters = True
        associationsPath = specificAssociPath
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps_{ahash}.txt".format(ahash=fileHash))
        mafCohortPath = os.path.join(basePath, "{m}_maf_{ahash}.txt".format(m=mafCohort, ahash=fileHash))
        if not omitPercentiles:
            percentilePath = os.path.join(basePath, "percentiles_{c}_{ahash}.txt".format(c=percentileCohort, ahash=fileHash))
        possibleAllelesPath = os.path.join(basePath, "possibleAlleles_{ahash}.txt".format(ahash=fileHash))

    ext = "txt" if isRSids else "vcf"
    filteredInputPath = os.path.join(basePath, "filteredInput_{ahash}_{uniq}.{ext}".format(ahash = fileHash, uniq = timestamp, ext = ext))

    try:
        # open the files that were previously created
        with open(associationsPath, 'r') as tableObjFile:
            tableObjDict = json.load(tableObjFile)
        with open(clumpNumPath, 'r') as clumpNumFile:
            clumpNumDict = json.load(clumpNumFile)
        with open(studySnpsPath, 'r') as studySnpsFile:
            studySnpsDict = json.load(studySnpsFile)
        with open(mafCohortPath, 'r') as mafFile:
            mafDict = json.load(mafFile)
        if not omitPercentiles:
            with open(percentilePath, 'r', encoding="utf-8") as percentileFile:
                percentileDict = json.load(percentileFile)
        else:
            percentileDict = {}
        with open(possibleAllelesPath, 'r') as possibleAllelesFile:
            possibleAlleles = json.load(possibleAllelesFile)

        # Get super populations from studyIDMetaData
        allSuperPops = set()
        for study in tableObjDict['studyIDsToMetaData']:
            for trait in tableObjDict['studyIDsToMetaData'][study]['traits']:
                superPopList = tableObjDict['studyIDsToMetaData'][study]['traits'][trait]['superPopulations']
                superPopList = [eachPop.lower() for eachPop in superPopList]
                preferredPop = getPreferredPop(superPopList, superPop)
                allSuperPops.add(preferredPop)

        # loop through each population and download the corresponding clumps file. Add that file to a dictionary
        # where {pop:clumps object, pop2: clumps object, etc.}
        allClumps = {}
        for pop in allSuperPops:
            if isFilters:
                clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = pop, r = refGen, ahash = fileHash))
                with open(clumpsPath, 'r') as clumpsObjFile:
                    clumpsObjDict = json.load(clumpsObjFile)
                    allClumps[pop] = clumpsObjDict
                    clumpsObjFile = {}
            else:
                clumpsPath = os.path.join(basePath, "{p}_clumps_{r}.txt".format(p = pop, r = refGen))
                with open(clumpsPath, 'r') as clumpsObjFile:
                    clumpsObjDict = json.load(clumpsObjFile)
                    allClumps[pop] = clumpsObjDict
                    clumpsObjFile = {}
    
    except FileNotFoundError:
        raise SystemExit("ERROR: One or both of the required working files could not be found. \n Paths searched for: \n{0}\n{1}\n{2}\n{3}\n{4}".format(associationsPath, clumpsPath, clumpNumPath, studySnpsPath, mafCohortPath))

    return tableObjDict, allClumps, clumpNumDict, studySnpsDict, possibleAlleles, mafDict, percentileDict, filteredInputPath


def formatAndReturnGenotype(genotype, REF, ALT):
    try:
        # read and interpret the genotype column from the VCF
        # if the genotype is not completely null
        if genotype != "./." and genotype != ".|." and genotype !=".." and genotype != '.':
            alleles = []
            if "|" in genotype:
                gt_nums = genotype.split('|')
            elif "/" in genotype:
                gt_nums = genotype.split('/')
            else:
                gt_nums = list(genotype)

            for alleleNum in gt_nums:
                if alleleNum == '0':
                    alleles.append(str(REF))
                elif alleleNum == '.':
                    alleles.append('.')
                else:
                    gt_num = int(alleleNum) - 1
                    alleles.append(str(ALT[gt_num]))
        else:
            alleles = [".", "."]

    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    return alleles


def parse_txt(filteredFilePath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, mafDict, p_cutOff, mafCutoff, trait, study, pValueAnno, betaAnnotation, valueType, timestamp, isIndividualClump, superPop):
    #create set to hold  the lines with a snp in this study
    studyLines = {}

    with open(filteredFilePath, 'r') as lines:
        string = ""
        # Iterate through each record in the file and save the SNP rs ID
        for line in lines:
            # remove all whitespace from line
            line = "".join(line.split())

            # initialize snp
            snp = ""

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
            # if the snp is in the study, add the line to the final file like object
            if snp in snpSet:
                studyLines[snp]=alleles

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    
    # Access the preferred super population for this study
    popList = tableObjDict['studyIDsToMetaData'][study]['traits'][trait]['superPopulations']
    popList = [eachPop.lower() for eachPop in popList]
    preferredPop = getPreferredPop(popList, superPop)

    # Create a dictionary with clump number and index snp to keep track of the variant with the lowest pvalue in each ld region
    index_snp_map = {}

    # create dictionaries to store the variants not used in the calculations
    clumpedVariants= set()
    unmatchedAlleleVariants = set()

    pValBetaAnnoValType = "|".join([pValueAnno, betaAnnotation, valueType])
    # iterate through each snp/alleles for this study
    usedSnps = set()
    excludedDueToCutoffs = set()
    for snp in studyLines:
        alleles = studyLines[snp]
        if alleles != [] and snp != "":
            # this if statement ensures that the trait/study combo actually exists in the tableObjDict for this snp
            # this is necessary due to excluded snps
            if trait in tableObjDict['associations'][snp]['traits'] and study in tableObjDict['associations'][snp]['traits'][trait] and pValBetaAnnoValType in tableObjDict['associations'][snp]['traits'][trait][study]:
                for riskAllele in tableObjDict['associations'][snp]['traits'][trait][study][pValBetaAnnoValType]:
                    # grab the corresponding pvalue and risk allele
                    pValue = tableObjDict['associations'][snp]['traits'][trait][study][pValBetaAnnoValType][riskAllele]['pValue']
                    mafVal = mafDict[snp]['alleles'][riskAllele] if snp in mafDict and riskAllele in mafDict[snp]["alleles"] else 0

                    # REMINDER: in parse_vcf we can perform strand flipping because the reference and alternate alleles are reported
                    # for txt, we are not going to do strand flipping since we don't have access to anything except the allele reported for the person

                    #compare the pvalue to the threshold
                    if pValue <= p_cutOff and mafVal >= mafCutoff:
                        usedSnps.add(snp)
                        if riskAllele in alleles or not isIndividualClump:
                            # Check to see if the snp position from this line in the file exists in the clump table
                            if snp in clumpsObjDict:
                                # Grab the clump number associated with this snp 
                                clumpNum = clumpsObjDict[snp]['clumpNum']
                                # check to see the number of variants in this ld clump. If the snp is the only one in the clump, we skip the clumping checks
                                clumpNumTotal = clumpNumDict[str((preferredPop,clumpNum))]

                                if clumpNumTotal > 1:
                                    # If this snp is in LD with any other snps, check whether the existing index snp or current snp have a lower pvalue 
                                    if clumpNum in index_snp_map:
                                        index_snp, index_rAllele, index_alleles = index_snp_map[clumpNum]
                                        index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study][pValBetaAnnoValType][index_rAllele]['pValue']

                                        if pValue < index_pvalue:
                                            index_snp_map[clumpNum] = snp, riskAllele, alleles
                                            # The snps that aren't index snps will be considered neutral snps
                                            clumpedVariants.add(index_snp)
                                        else:
                                            clumpedVariants.add(snp)
                                    else:
                                        # Since the clump number for this snp position and studyID
                                        # doesn't already exist, add it to the index map
                                        index_snp_map[clumpNum] = snp, riskAllele, alleles
                                else:
                                    # the variant is the only one in the ld clump
                                    sample_map[snp] = alleles
                            # The snp wasn't in the clump map (meaning it wasn't in 1000 Genomes), so add it
                            else:
                                sample_map[snp] = alleles
                        else:
                            # the risk allele wasn't in the listed alleles
                            unmatchedAlleleVariants.add(snp)
                    else:
                        excludedDueToCutoffs.add(snp)

    snpOverlap = len(usedSnps)
    # This next code accounts for snps that are in the study but are not reported in the sample. Instead of assuming the reference allele, we 
    # assume that the allele is unknown and thus will use MAF for calculations of these snps
    snpsLeftToImpute = set(snpSet).difference(usedSnps | excludedDueToCutoffs)
    for snp in snpsLeftToImpute:
        if trait in tableObjDict['associations'][snp]['traits'] and study in tableObjDict['associations'][snp]['traits'][trait] and pValBetaAnnoValType in tableObjDict['associations'][snp]['traits'][trait][study]:
            for riskAllele in tableObjDict['associations'][snp]['traits'][trait][study][pValBetaAnnoValType]:
                # grab the corresponding pvalue
                pValue = tableObjDict['associations'][snp]['traits'][trait][study][pValBetaAnnoValType][riskAllele]['pValue']
                mafVal = mafDict[snp]['alleles'][riskAllele] if snp in mafDict and riskAllele in mafDict[snp]["alleles"] else 0
                #compare the pvalue to the threshold
                if pValue <= p_cutOff and mafVal >= mafCutoff:
                    if snp in clumpsObjDict:
                        # Grab the clump number associated with this snp 
                        clumpNum = clumpsObjDict[snp]['clumpNum']
                        # check to see the number of variants in this ld clump. If the snp is the only one in the clump, we skip the clumping checks
                        clumpNumTotal = clumpNumDict[str((preferredPop,clumpNum))]

                        if clumpNumTotal > 1:
                            # If this snp is in LD with any other snps, check whether the existing index snp or current snp have a lower pvalue 
                            if clumpNum in index_snp_map:
                                index_snp, index_rAllele, index_alleles = index_snp_map[clumpNum]
                                index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study][pValBetaAnnoValType][index_rAllele]['pValue']

                                if pValue < index_pvalue:
                                    index_snp_map[clumpNum] = snp, riskAllele, [".", "."]
                                    # The snps that aren't index snps will be considered neutral snps
                                    clumpedVariants.add(index_snp)
                                else:
                                    clumpedVariants.add(snp)
                            else:
                                # Since the clump number for this snp position and studyID
                                # doesn't already exist, add it to the index map
                                index_snp_map[clumpNum] = snp, riskAllele, [".", "."]
                        else:
                            # the variant is the only one in the ld clump
                            sample_map[snp] = [".", "."]
                    # The snp wasn't in the clump map (meaning it wasn't in 1000 Genomes), so add it
                    else:
                        sample_map[snp] = [".", "."]
                else:
                    excludedDueToCutoffs.add(snp)

    includedSnps = len(set(snpSet).difference(excludedDueToCutoffs) | usedSnps)
    snpsExcluded = len(excludedDueToCutoffs)
    # loop through each LD clump and add the index snp to the final sample map
    for clumpNum in index_snp_map:
        snp, rAllele, alleles = index_snp_map[clumpNum]
        sample_map[snp] = alleles

    final_map = dict(sample_map)
    return final_map, clumpedVariants, unmatchedAlleleVariants, snpOverlap, snpsExcluded, includedSnps, preferredPop


def parse_vcf(filteredFilePath, clumpsObjDict, tableObjDict, possibleAlleles, snpSet, clumpNumDict, mafDict, p_cutOff, mafCutoff, trait, study, pValueAnno, betaAnnotation, valueType, timestamp, isIndividualClump, superPop):
    # variable to keep track of the number of samples in the input file
    sampleNum=0
    snpOverlap = 0
    createMaf = False

    if mafDict is None:
        createMaf = True

    # loop through the input file and once you get to the CHROM line, count the samples and break
    with open(filteredFilePath, 'r') as f:
        for line in f:
            if line[0:6] == '#CHROM':
                cols=line.split('\t')
                samples=cols[9:]
                sampleNum=len(samples)
                break
        
    if sampleNum > 50:
        # create a temp file that will hold the lines of snps found in this trait/study
        basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
        studyHash = '{t}|{s}|{p}|{b}|{v}'.format(t=trait, s=study, p=pValueAnno, b=betaAnnotation, v=valueType)
        studyHash = studyHash.encode()
        hashObj = hashlib.md5(studyHash)
        studyHash = hashObj.hexdigest()
        tempFilePath = os.path.join(basePath, "{s}_{h}_{uniq}.vcf".format(s=study, h=studyHash, uniq = timestamp))
        useFilePath = tempFilePath
        with open(tempFilePath, 'w', encoding="utf-8") as w:
            # Open filtered file
            with open(filteredFilePath, 'r', encoding="utf-8") as f:
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

    else:
        with open(filteredFilePath, 'r') as f:
            string = ""
            for line in f:
                # check if the line is a header
                if line[0] == '#':
                    string += line
                else:
                    # cut the line and get the column values
                    shortLine = line[0:500]
                    cols = shortLine.split('\t')
                    rsID = cols[2]
                    chromPos = str(cols[0]) + ':' + str(cols[1])
                    if (chromPos in tableObjDict['associations'] and (rsID is None or rsID not in tableObjDict['associations'])):
                        rsID = tableObjDict['associations'][chromPos]

                    # if the rsid is in the study/trait, write the line to the memory file
                    if rsID in snpSet:
                        string += line
            useFilePath = StringIO(string)

    # Create a dictionary to keep track of the variants in each study
    sample_map = defaultdict(dict)

    # Create a dictionary with clump number and index snps to keep track of the index snp for each LD region
    index_snp_map = defaultdict(dict)

    # Access the super population used for clumping this study
    popList = tableObjDict['studyIDsToMetaData'][study]['traits'][trait]['superPopulations']
    popList = [eachPop.lower() for eachPop in popList]
    preferredPop = getPreferredPop(popList, superPop)

    # Create dictionaries to store the variants not used in the calculations for each sample
    neutral_snps_map = {}
    clumped_snps_map = {}

    # open the tempFile as a vcf reader now
    if sampleNum > 50:
        vcf_reader = vcf.Reader(open(useFilePath, 'r'))
    else:
        vcf_reader = vcf.Reader(useFilePath)

    # Get the number of samples in the vcf
    sampleOrder = vcf_reader.samples
    sample_num = len(sampleOrder)


    try:
        # Iterate through each line in the vcf file
        usedSnps = set()
        excludedDueToCutoffs = set()
        pValBetaAnnoValType = "|".join([pValueAnno, betaAnnotation, valueType])
        for record in vcf_reader:
            string_format = str(record.FORMAT)
            rsID = record.ID
            chromPos = str(record.CHROM) + ":" + str(record.POS)
            if (chromPos in tableObjDict['associations'] and (rsID is None or rsID not in tableObjDict['associations'])):
                rsID = tableObjDict['associations'][chromPos]

            # check to see if the snp is in this particular trait/study
            if rsID in snpSet:
                # this if statement ensures that the trait/study combo actually exists in the tableObjDict for this rsID
                # this is necessary due to excluded snps
                if trait in tableObjDict['associations'][rsID]['traits'] and study in tableObjDict['associations'][rsID]['traits'][trait] and pValBetaAnnoValType in tableObjDict['associations'][rsID]['traits'][trait][study]:
                    ALT = record.ALT
                    REF = record.REF 

                    # if we need to create the maf, do it here
                    if createMaf:
                        lineInfo = record.INFO["AF"]
                        if rsID not in mafDict:
                            mafDict[rsID] = {
                                "chrom": record.CHROM,
                                "pos": record.POS,
                                "alleles": {}
                            }
                        for i in len(ALT):
                            allele = str(ALT[i])
                            if allele not in mafDict[rsID]["alleles"]:
                                mafDict[rsID]["alleles"][allele] = lineInfo[i]

                        if REF not in mafDict[rsID]["alleles"]:
                            mafDict[rsID]["alleles"][REF] = 1 - sum(lineInfo)

                    for riskAllele in tableObjDict['associations'][rsID]['traits'][trait][study][pValBetaAnnoValType]:
                        #grab the corresponding pvalue and risk allele
                        pValue = tableObjDict['associations'][rsID]['traits'][trait][study][pValBetaAnnoValType][riskAllele]['pValue']
                        mafVal = mafDict[rsID]['alleles'][riskAllele] if rsID in mafDict and riskAllele in mafDict[rsID]["alleles"] else 0

                        # compare the pvalue to the pvalue cutoff
                        if pValue <= p_cutOff and mafVal >= mafCutoff:
                            usedSnps.add(rsID)
                            # loop through each sample of the vcf file
                            for call in record.samples:
                                sample = call.sample
                                genotype = record.genotype(sample)['GT']
                                alleles = formatAndReturnGenotype(genotype, REF, ALT)
                                complements = takeComplement(possibleAlleles[rsID], alleles, REF, ALT) if rsID in possibleAlleles else None

                                # Grab or create maps that hold sets of unused variants for this sample
                                clumpedVariants = clumped_snps_map[sample] if sample in clumped_snps_map else set()
                                unmatchedAlleleVariants = neutral_snps_map[sample] if sample in neutral_snps_map else set()

                                atRisk = True if riskAllele in alleles or (complements is not None and riskAllele in complements) or "." in alleles else False
                                if atRisk or not isIndividualClump:
                                    if rsID in clumpsObjDict:
                                        # Grab the clump number associated with this study and snp position
                                        clumpNum = clumpsObjDict[rsID]['clumpNum']
                                        # Check to see how many variants are in this clump. If there's only one, we can skip the clumping checks.
                                        clumpNumTotal = clumpNumDict[str((preferredPop,clumpNum))]

                                        if clumpNumTotal > 1:
                                            if sample in index_snp_map:
                                                # if the clump number for this snp position and study/name is already in the index map, move forward
                                                if clumpNum in index_snp_map[sample]:
                                                    index_snp, index_rAllele, index_alleles = index_snp_map[sample][clumpNum]
                                                    index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study][pValBetaAnnoValType][index_rAllele]['pValue']

                                                    # Check whether the existing index snp or current snp have a lower pvalue for this study
                                                    # and switch out the data accordingly
                                                    if pValue < index_pvalue:
                                                        index_snp_map[sample][clumpNum] = rsID, riskAllele, alleles if complements is None else complements
                                                        clumpedVariants.add(index_snp)
                                                    else:
                                                        if index_alleles == "" and alleles != "" and isIndividualClump:
                                                            index_snp_map[sample][clumpNum] = rsID, riskAllele, alleles if complements is None else complements
                                                            clumpedVariants.add(index_snp)
                                                        else:
                                                            clumpedVariants.add(rsID)
                                                else:
                                                    # Since the clump number for this snp position and study/name
                                                    # doesn't already exist, add it to the index map and the sample map
                                                    index_snp_map[sample][clumpNum] = rsID, riskAllele, alleles if complements is None else complements
                                            else:
                                                # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                                                index_snp_map[sample][clumpNum] = rsID, riskAllele, alleles if complements is None else complements
                                        # the variant is the only one in the ld clump
                                        else:
                                            sample_map[sample][rsID] = alleles if complements is None else complements
                                    # the variant isn't in the clump tables
                                    else:
                                        sample_map[sample][rsID] = alleles if complements is None else complements

                                # the sample's alleles don't include the risk allele and early clumping is not requested
                                else:
                                    unmatchedAlleleVariants.add(rsID)

                                    clumped_snps_map[sample] = clumpedVariants
                                    neutral_snps_map[sample] = unmatchedAlleleVariants
                        else:
                            excludedDueToCutoffs.add(rsID)

        snpOverlap = len(usedSnps)
        # This next code accounts for snps that are in the study but are not reported in the sample. Instead of assuming the reference allele, we 
        # assume that the allele is unknown and thus will use MAF for calculations of these snps
        snpsLeftToImpute = set(snpSet).difference(usedSnps | excludedDueToCutoffs)
        for sample in sampleOrder:
            # Grab or create maps that hold sets of unused variants for this sample
            clumpedVariants = clumped_snps_map[sample] if sample in clumped_snps_map else set()
            for rsID in snpsLeftToImpute:
                if trait in tableObjDict['associations'][rsID]['traits'] and study in tableObjDict['associations'][rsID]['traits'][trait] and pValBetaAnnoValType in tableObjDict['associations'][rsID]['traits'][trait][study]:
                    for riskAllele in tableObjDict['associations'][rsID]['traits'][trait][study][pValBetaAnnoValType]:
                        pValue = tableObjDict['associations'][rsID]['traits'][trait][study][pValBetaAnnoValType][riskAllele]['pValue']
                        mafVal = mafDict[rsID]['alleles'][riskAllele] if rsID in mafDict and riskAllele in mafDict[rsID]["alleles"] else 0
                        # compare the pvalue to the pvalue cutoff
                        if pValue <= p_cutOff and mafVal >= mafCutoff:
                            if rsID in clumpsObjDict:
                                # Grab the clump number associated with this study and snp position
                                clumpNum = clumpsObjDict[rsID]['clumpNum']
                                # Check to see how many variants are in this clump. If there's only one, we can skip the clumping checks.
                                clumpNumTotal = clumpNumDict[str((preferredPop,clumpNum))]

                                if clumpNumTotal > 1:
                                    if sample in index_snp_map:
                                        # if the clump number for this snp position and study/name is already in the index map, move forward
                                        if clumpNum in index_snp_map[sample]:
                                            index_snp, index_rAllele, index_alleles = index_snp_map[sample][clumpNum]
                                            index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study][pValBetaAnnoValType][index_rAllele]['pValue']

                                            if not isIndividualClump:
                                                # Check whether the existing index snp or current snp have a lower pvalue for this study
                                                # and switch out the data accordingly
                                                if pValue < index_pvalue:
                                                    index_snp_map[sample][clumpNum] = rsID, riskAllele, [".", "."]
                                                    clumpedVariants.add(index_snp)
                                                else:
                                                    clumpedVariants.add(rsID)
                                            else: #isIndividualClump
                                                # Check whether the existing index snp or current snp have a lower pvalue for this study
                                                # and switch out the data accordingly
                                                if pValue < index_pvalue:
                                                    index_snp_map[sample][clumpNum] = rsID, riskAllele, [".", "."]
                                                    clumpedVariants.add(index_snp)
                                                else:
                                                    if index_alleles == "":
                                                        index_snp_map[sample][clumpNum] = rsID, riskAllele, [".", "."]
                                                        clumpedVariants.add(index_snp)
                                                    else:
                                                        clumpedVariants.add(rsID)
                                        else:
                                            # Since the clump number for this snp position and study/name
                                            # doesn't already exist, add it to the index map and the sample map
                                            index_snp_map[sample][clumpNum] = rsID, riskAllele, [".", "."]
                                    else:
                                        # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                                        index_snp_map[sample][clumpNum] = rsID, riskAllele, [".", "."]
                                # the variant is the only one in its clump
                                else:
                                    sample_map[sample][rsID] = [".", "."]
                            # the variant isn't in the clump tables
                            else:
                                sample_map[sample][rsID] = [".", "."]
                        else:
                            excludedDueToCutoffs.add(rsID)
            clumped_snps_map[sample] = clumpedVariants

        # Add the index snp for each sample's ld clump to the sample map
        for sample in index_snp_map:
                for clumpNum in index_snp_map[sample]:
                    rsID, rAllele, alleles = index_snp_map[sample][clumpNum]
                    sample_map[sample][rsID] = alleles

    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    includedSnps = len(set(snpSet).difference(excludedDueToCutoffs) | usedSnps)
    snpsExcluded = len(excludedDueToCutoffs)
    final_map = dict(sample_map)
    vcf_reader = None

    #remove temp file
    if sampleNum > 50:
        if os.path.exists(tempFilePath):
            os.remove(tempFilePath)

    return final_map, mafDict, neutral_snps_map, clumped_snps_map, sample_num, sampleOrder, snpOverlap, snpsExcluded, includedSnps, preferredPop


def takeComplement(possibleAlleles, alleles, REF, ALT):
    fileAlleles = [REF] + [str(x) for x in ALT]
    complements = [reverse_complement(x) for x in fileAlleles]

    # just trying to make sure we are as accurate as possible in our strand flipping --
    # if all the complements are in the possible alleles and none of the original alleles are in the possible alleles, then flip it
    if (all(x in possibleAlleles for x in complements) and not all(x in possibleAlleles for x in fileAlleles)):
        return [reverse_complement(x) for x in alleles]
    else:
        return None


def getSamples(inputFilePath, header):
    # Open filtered file
    vcf_reader = vcf.Reader(open(inputFilePath, 'r'))
    samples = vcf_reader.samples
    header.extend(samples)
    return header


def runParsingAndCalculations(inputFilePath, fileHash, requiredParamsHash, superPop, mafCohort, refGen, pValue, mafCutoff, extension, outputFilePath, outputType, isCondensedFormat, omitPercentiles, timestamp, num_processes, isIndividualClump, useGWASupload):
    paramOpts = []
    if num_processes == "":
        num_processes = None
    else:
        num_processes = int(num_processes)

    omitPercentiles = False if int(omitPercentiles) == 0 else True
    
    # tells us if we were passed rsIDs or a vcf
    isRSids = True if extension.lower().endswith(".txt") or inputFilePath.lower().endswith(".txt") else False

    # Access the downloaded files and paths
    tableObjDict, allClumpsObjDict, clumpNumDict, studySnpsDict, possibleAlleles, mafDict, percentileDict, filteredInputPath = getDownloadedFiles(fileHash, requiredParamsHash, superPop, mafCohort, refGen, isRSids, omitPercentiles, timestamp, useGWASupload)
    
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
        # we need to make sure the outputFile doesn't already exist so that we don't append to an old file
        if os.path.exists(outputFilePath):
            os.remove(outputFilePath)
            jsonOutput = open(outputFilePath, 'w')
            jsonOutput.write("[]")
            jsonOutput.close()

    else:
        # we need to write out the header depending on the output type
        header = []
        if isCondensedFormat and isRSids: # condensed and txt input
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation', 'P-Value Annotation', 'Beta Annotation', 'Score Type', 'Units (if applicable)', 'SNP Overlap', 'SNPs Excluded Due To Cutoffs', 'Included SNPs', 'Used Super Population', 'Polygenic Risk Score']
        elif isCondensedFormat: # condensed and vcf input
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation', 'P-Value Annotation', 'Beta Annotation', 'Score Type', 'Units (if applicable)', 'SNP Overlap', 'SNPs Excluded Due To Cutoffs', 'Included SNPs', 'Used Super Population']
            # loop through each sample and add to the header
            header = getSamples(filteredInputPath, header)
        elif not isCondensedFormat  and isRSids: # verbose and txt input
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation', 'P-Value Annotation', 'Beta Annotation', 'Score Type', 'Units (if applicable)', 'SNP Overlap', 'SNPs Excluded Due To Cutoffs', 'Included SNPs', 'Used Super Population', 'Polygenic Risk Score', 'Percentile', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
        else: # verbose and vcf input
            header = ['Sample', 'Study ID', 'Reported Trait', 'Trait', 'Citation', 'P-Value Annotation', 'Beta Annotation', 'Score Type', 'Units (if applicable)', 'SNP Overlap', 'SNPs Excluded Due To Cutoffs', 'Included SNPs', 'Used Super Population', 'Polygenic Risk Score', 'Percentile', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
        cs.formatTSV(True, None, header, outputFilePath)

    # we create params for each study so that we can run them on separate processes
    for keyString in studySnpsDict:
        trait, pValueAnno, betaAnnotation, valueType, study = keyString.split('|')
        # get all of the variants associated with this trait/study
        snpSet = studySnpsDict[keyString]
        uniquePercentileDict = percentileDict[keyString] if not omitPercentiles and keyString in percentileDict else {}
        # get the population used for clumping
        popList = tableObjDict['studyIDsToMetaData'][study]['traits'][trait]['superPopulations']
        popList = [eachPop.lower() for eachPop in popList]
        preferredPop = getPreferredPop(popList, superPop)
        clumpsObjDict = allClumpsObjDict[preferredPop]
        paramOpts.append((filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, possibleAlleles, mafDict, uniquePercentileDict, pValue, mafCutoff, trait, study, pValueAnno, betaAnnotation, valueType, isJson, isCondensedFormat, omitPercentiles, outputFilePath, isRSids, timestamp, isIndividualClump, superPop))
        # if no subprocesses are going to be used, run the calculations once for each study/trait
        if num_processes == 0:
            parseAndCalculateFiles((filteredInputPath, clumpsObjDict, tableObjDict, snpSet, clumpNumDict, possibleAlleles, mafDict, uniquePercentileDict, pValue, mafCutoff, trait, study, pValueAnno, betaAnnotation, valueType, isJson, isCondensedFormat, omitPercentiles, outputFilePath, isRSids, timestamp, isIndividualClump, superPop))

    if num_processes is None or (type(num_processes) is int and num_processes > 0):
        with Pool(processes=num_processes) as pool:
            pool.map(parseAndCalculateFiles, paramOpts)

    if isJson: #json and verbose
        # we need to make sure the outputFile doesn't already exist so that we don't append to an old file
        if os.path.exists(outputFilePath):
            jsonOutput = open(outputFilePath, 'r+')
            jsonOutput.seek(0,2)
            position = jsonOutput.tell() -2
            print(position)
            jsonOutput.seek(position)
            jsonOutput.write(" ")
            jsonOutput.close()

if __name__ == "__main__":
    useGWASupload = True if sys.argv[17] == "True" or sys.argv[17] == True else False
    runParsingAndCalculations(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7], sys.argv[8], sys.argv[9], sys.argv[10], sys.argv[11], sys.argv[12], sys.argv[13], sys.argv[14], sys.argv[15], sys.argv[16], useGWASupload)

