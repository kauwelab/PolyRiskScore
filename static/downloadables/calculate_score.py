import sys
import vcf
import zipfile
import tarfile
import gzip
from collections import defaultdict
import json
import math
import csv
 

def calculateScore(inputFile, pValue, outputType, tableObjDict, clumpsObjDict, refGen, isCondensedFormat, outputFile, traits, studyTypes, studyIDs, ethnicities):
    tableObjDict = json.loads(tableObjDict)
    clumpsObjDict = json.loads(clumpsObjDict)

    # Format variables used for filtering
    traits = formatTraits(traits)
    studyTypes = studyTypes.upper()
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.upper()
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicities = ethnicities.lower()
    ethnicities = ethnicities.split(" ") if ethnicities != "" else None
    if ethnicities is not None:
        ethnicities = [sub.replace("_", " ") for sub in ethnicities]

    # tells us if we were passed rsIDs or a vcf
    isRSids = True if inputFile.lower().endswith(".txt") else False

    if isRSids:
        txtObj, neutral_snps_map, clumped_snps_map, studySnps = parse_txt(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
        txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, studySnps)
    else:
        vcfObj, neutral_snps_map, clumped_snps_map, samp_num, studySnps = parse_vcf(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
        vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, studySnps)
    return


def formatTraits(traits):
    traits = traits.lower()
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        for i in range(len(traits)):
            trait = traits[i].replace('_', ' ').replace("\\'", "\'").split(" ")
            for j in range(len(trait)):
                trait[j] = trait[j].capitalize()
            traits[i] = " ".join(trait)
    return traits


def parse_txt(txtFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, p_cutOff):
    openFile = open(txtFile, 'r')
    
    Lines = openFile.readlines()

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a set to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_set = set()

    # Create a dictionary of studyIDs to neutral snps
    neutral_snps_map = {}
    clumped_snps_map = {}

    isAllFiltersNone = (traits is None and studyIDs is None and studyTypes is None and ethnicities is None)

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        try:
            line = line.strip() #line should be in format of rsID:Genotype,Genotype
            snp, alleles = line.split(':')
            allele1, allele2 = alleles.split(',')
            alleles = [allele1, allele2]
        except ValueError:
            raise SystemExit("ERROR: Some lines in the input file are not formatted correctly. Please ensure that all lines are formatted correctly (rsID:Genotype,Genotype)")
        
        if alleles != []: 
            # if the position is found in our database 
            if snp in tableObjDict['associations']:
                # Loop through each trait for the position
                for trait in tableObjDict['associations'][snp]['traits'].keys():
                    # initializing variables
                    useTrait = False
                    useStudy = False
                    # if there are traits to filter by and the trait for this snp is in the list, use this trait 
                    if traits is not None and trait in traits:
                        useTrait = True
                    # Loop through each study containing the position
                    for studyID in tableObjDict['associations'][snp]['traits'][trait].keys():
                        # if we aren't going to use all the associations, decide if this is one that we will use
                        if not isAllFiltersNone:
                            studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                            useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait)
                        if isAllFiltersNone or useStudy:
                            # Grab the pValue and risk allele for this association
                            pValue = tableObjDict['associations'][snp]['traits'][trait][studyID]['pValue']
                            riskAllele = tableObjDict['associations'][snp]['traits'][trait][studyID]['riskAllele']
                            if pValue <= float(p_cutOff): # Check if the association's pvalue is more significant than the given threshold
                                trait_study = (trait, studyID)
                                clumpedVariants = clumped_snps_map[trait_study] if trait_study in clumped_snps_map else set()
                                unmatchedAlleleVariants = neutral_snps_map[trait_study] if trait_study in neutral_snps_map else set()
                                # Check to see if the snp position from this line in the file exists in the clump table
                                if snp in clumpsObjDict:
                                    # Grab the clump number associated with this snp 
                                    clumpNum = clumpsObjDict[snp]['clumpNum']

                                    if riskAllele in alleles:
                                        counter_set.add(trait_study) # add this trait/study to the counter set because there was a viable snp

                                        # Check if the studyID has been used in the index snp map yet
                                        # The index snp map keeps track of the snps that will represent each ld clump
                                        if trait_study in index_snp_map:
                                            # Check whether the existing index snp or current snp have a lower pvalue for this study
                                            # and switch out the data accordingly
                                            if clumpNum in index_snp_map[trait_study]:
                                                index_snp = index_snp_map[trait_study][clumpNum]
                                                index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][studyID]['pValue']
                                                if pValue < index_pvalue:
                                                    del index_snp_map[trait_study][clumpNum]
                                                    index_snp_map[trait_study][clumpNum] = snp
                                                    del sample_map[trait_study][index_snp]
                                                    sample_map[trait_study][snp] = alleles
                                                    # The snps that aren't index snps will be considered neutral snps
                                                    clumpedVariants.add(index_snp)
                                                else:
                                                    clumpedVariants.add(snp)
                                            else:
                                                # Since the clump number for this snp position and studyID
                                                # doesn't already exist, add it to the index map and the sample map
                                                index_snp_map[trait_study][clumpNum] = snp
                                                sample_map[trait_study][snp] = alleles
                                        else:
                                            # Since the trait_study wasn't already used in the index map, add it to both the index and sample map
                                            index_snp_map[trait_study][clumpNum] = snp
                                            sample_map[trait_study][snp] = alleles
                                    else:
                                        unmatchedAlleleVariants.add(snp)
                                # The snp wasn't in the clump map (meaning it wasn't i 1000 Genomes), so add it
                                else:
                                    sample_map[trait_study][snp] = alleles
                                    counter_set.add(trait_study)

                            neutral_snps_map[trait_study] = unmatchedAlleleVariants
                            clumped_snps_map[trait_study] = clumpedVariants

    studySnps = {}
    for key in tableObjDict['associations'].keys():
        if ("rs" in key):
            for trait in tableObjDict['associations'][key]['traits'].keys():
                # initializing variables
                useTrait = False
                useStudy = False
                if traits is not None and trait in traits:
                    useTrait = True
                for study in tableObjDict['associations'][key]['traits'][trait].keys():
                    if not isAllFiltersNone:
                        studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                        useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait)
                    if isAllFiltersNone or useStudy:
                        pValue = tableObjDict['associations'][snp]['traits'][trait][studyID]['pValue']
                        if pValue <= float(p_cutOff):
                            # Create a map between each study and the corresponding snps
                            if study in studySnps:
                                snpSet = studySnps[study]
                            else:
                                snpSet = set()
                            snpSet.add(key)
                            studySnps[study]=snpSet
                        if (trait, study) not in neutral_snps_map:
                            neutral_snps_map[(trait, study)] = set()
                        if (trait, study) not in clumped_snps_map:
                            clumped_snps_map[(trait, study)] = set()
                        if (trait,study) not in counter_set:
                            sample_map[(trait,study)][""] = ""


    final_map = dict(sample_map)
    return final_map, neutral_snps_map, clumped_snps_map, studySnps


# determines if we should use this association based on the filters given
def shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait):
    useStudyID = False
    useReportedTrait = False
    useEthnicity = False
    useStudyType = False

    # if the studyID matches one that was selected, use it
    if studyIDs is not None and studyID in studyIDs:
        useStudyID = True

    if studyIDs is not None and traits is None and ethnicities is None and studyTypes is None:
        return useStudyID

    # set use trait to True if we aren't specificallly filtering by it
    if traits is None:
        useTrait = True
    # if the reportedTrait for the study is in the traits list for filtering, useReportedTrait is true
    if traits is None or (traits is not None and studyMetaData is not None and studyMetaData['reportedTrait'] in traits):
        useReportedTrait = True
    if studyMetaData is not None and studyMetaData['ethnicity'] is not None: #TODO should probably come up with a better way to handle a situation like this, we need to decide what we will do when the study doens't have an ethnicity attached to it (maybe give it 'other' on the server?)
        ethnicitiesLower = set([x.lower() for x in studyMetaData['ethnicity']])
        # if the ethnicities have overlap, set useEthnicity to true
        if (useTrait or useReportedTrait) and ethnicities is None or (ethnicities is not None and (len(set(ethnicities).intersection(ethnicitiesLower)) > 0)):
            useEthnicity = True
    # if we have studyTypes that match the filter, set useStudyType to true
    if (((useTrait and studyTypes is None) or (useTrait and studyTypes is not None and len(set(studyTypes).intersection(set(studyMetaData['traits'][trait]))) > 0)) or 
            ((useReportedTrait and studyTypes is None) or (useReportedTrait and studyTypes is not None and len(set(studyTypes).intersection(set(studyMetaData['studyTypes']))) > 0))):
        useStudyType = True
    # we either want to use this study because of the studyID or because filtering trait, ethnicity, and studyTypes give us this study
    return useStudyID or (useEthnicity and useStudyType)


def openFileForParsing(inputFile):
    # Check if the file is zipped
    if inputFile.endswith(".zip"):
        # If the file is zipped, extract it
        with zipfile.ZipFile(inputFile, "r") as zipObj:
            zipObj.extractall("./")
        # Access the new name of the file (without .zip)
        temps = inputFile.split('.zip')
        norm_file = temps[0]
        # Use the vcf reader to open the newly unzipped file
        vcf_reader = vcf.Reader(open(norm_file, "r"))
    # Check if file is gzipped and open it with vcf reader
    elif inputFile.endswith(".gz") or inputFile.endswith(".gzip") or inputFile.endswith(".tgz"):
        vcf_reader = vcf.Reader(filename=inputFile)
    # If the file is normal, open it with the vcf reader
    else:
        vcf_reader = vcf.Reader(open(inputFile, "r"))

    return vcf_reader


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


def parse_vcf(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, p_cutOff):
    totalLines = 0 

    vcf_reader = openFileForParsing(inputFile)
    
    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a list to keep track of which study/samples have viable snps and which ones don't 
    counter_set = set()
    neutral_snps_map = {}
    clumped_snps_map = {}
    sample_num = len(vcf_reader.samples)

    isAllFiltersNone = (traits is None and studyIDs is None and studyTypes is None and ethnicities is None)

    try:
        # Iterate through each line in the vcf file
        for record in vcf_reader:
            string_format = str(record.FORMAT)
            if 'GT' in string_format: #TODO might not need this line anymore
                rsID = record.ID
                chromPos = str(record.CHROM) + ":" + str(record.POS)
                if (rsID is None and chromPos in tableObjDict['associations']):
                    rsID = tableObjDict['associations'][chromPos]
                ALT = record.ALT
                REF = record.REF 
                # if the position is found in our database 
                if rsID in tableObjDict['associations']:
                    # Loop through each trait for the position
                    for trait in tableObjDict['associations'][rsID]['traits'].keys():
                        # initializing variables
                        useTrait = False
                        useStudy = False
                        # if there are traits to filter by and the trait for this snp is in the list, use this trait 
                        if traits is not None and trait in traits:
                            useTrait = True
                        # Loop through each study containing the position
                        for study in tableObjDict['associations'][rsID]['traits'][trait].keys():
                            # if we aren't going to use all the associations, decide if this is one that we will use
                            if not isAllFiltersNone:
                                studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                                useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
                            if isAllFiltersNone or useStudy:
                                # Loop through each sample of the vcf file
                                for call in record.samples:
                                    name = call.sample
                                    genotype = record.genotype(name)['GT']
                                    alleles = formatAndReturnGenotype(genotype, REF, ALT)
                                    # Create a tuple with the study and sample name
                                    trait_study_sample = (trait, study, name)
                                    clumpedVariants = clumped_snps_map[trait_study_sample] if trait_study_sample in clumped_snps_map else set()
                                    unmatchedAlleleVariants = neutral_snps_map[trait_study_sample] if trait_study_sample in neutral_snps_map else set()
                                    # grab pValue and riskAllele
                                    pValue = tableObjDict['associations'][rsID]['traits'][trait][study]['pValue']
                                    riskAllele = tableObjDict['associations'][rsID]['traits'][trait][study]['riskAllele']

                                    # compare the pvalue to the pvalue cutoff
                                    
                                    if pValue <= float(p_cutOff):
                                        # Add the study/sample tuple to the counter list because we now know at least there is
                                        # at least one viable snp for this combination 
                                        counter_set.add(trait_study_sample)
                                        # Check to see if the snp position from this line in the vcf exists in the clump table for this study
                                        if rsID in clumpsObjDict:
                                            # Grab the clump number associated with this study and snp position
                                            clumpNum = clumpsObjDict[rsID]['clumpNum'] 
                                            totalLines += 1
                                            
                                            if trait_study_sample in index_snp_map:
                                                # if the clump number for this snp position and study/name is already in the index map, move forward
                                                if clumpNum in index_snp_map[trait_study_sample]:
                                                    # Check whether the existing index snp or current snp have a lower pvalue for this study
                                                    # and switch out the data accordingly
                                                    # if the current snp position has no alleles, do not add it to the maps
                                                    # if the existing index snp has no alleles, put in the current snp even if the pvalue is higher
                                                    index_snp = index_snp_map[trait_study_sample][clumpNum]
                                                    index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study]['pValue']
                                                    if pValue < index_pvalue and riskAllele in alleles:
                                                        del index_snp_map[trait_study_sample][clumpNum]
                                                        index_snp_map[trait_study_sample][clumpNum] = rsID
                                                        del sample_map[trait_study_sample][index_snp]
                                                        sample_map[trait_study_sample][rsID] = alleles
                                                        clumpedVariants.add(index_snp)
                                                    elif pValue > index_pvalue and riskAllele in alleles:
                                                        if sample_map[trait_study_sample][index_snp] == "":
                                                            del index_snp_map[trait_study_sample][clumpNum]
                                                            index_snp_map[trait_study_sample][clumpNum] = rsID
                                                            del sample_map[trait_study_sample][index_snp]
                                                            sample_map[trait_study_sample][rsID] = alleles
                                                            clumpedVariants.add(index_snp)
                                                        else:
                                                            clumpedVariants.add(rsID)
                                                    else:
                                                        unmatchedAlleleVariants.add(rsID)
                                                else:
                                                    # Since the clump number for this snp position and study/name
                                                    # doesn't already exist, add it to the index map and the sample map
                                                    index_snp_map[trait_study_sample][clumpNum] = rsID
                                                    sample_map[trait_study_sample][rsID] = alleles
                                            else:
                                                # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                                                index_snp_map[trait_study_sample][clumpNum] = rsID
                                                sample_map[trait_study_sample][rsID] = alleles
                                        else:
                                            sample_map[trait_study_sample][rsID] = alleles
                                        neutral_snps_map[trait_study_sample] = unmatchedAlleleVariants
                                        clumped_snps_map[trait_study_sample] = clumpedVariants
        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        # TODO: might need a better way to handle this
        for name in vcf_reader.samples:
            studySnps = {}
            for key in tableObjDict['associations'].keys():
                if ("rs" in key):
                    for trait in tableObjDict['associations'][key]['traits'].keys():
                        # initializing variables
                        useTrait = False
                        useStudy = False
                        if traits is not None and trait in traits:
                            useTrait = True
                        for study in tableObjDict['associations'][key]['traits'][trait].keys():
                            if not isAllFiltersNone:
                                studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                                addStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
                            if isAllFiltersNone or addStudy:
                                pValue = tableObjDict['associations'][key]['traits'][trait][study]['pValue']
                                if pValue <= float(p_cutOff):
                                    if study in studySnps:
                                        snpSet = studySnps[study]
                                    else:
                                        snpSet = set()
                                    snpSet.add(key)
                                    studySnps[study]=snpSet
                                if (trait, study, name) not in neutral_snps_map:
                                    neutral_snps_map[(trait, study, name)] = set()
                                if (trait, study, name) not in clumped_snps_map:
                                    clumped_snps_map[(trait, study, name)] = set()
                                if (trait,study,name) not in counter_set:
                                    sample_map[(trait,study,name)][""] = ""
    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    final_map = dict(sample_map)
    # raise SystemExit("BYE BYE")
    return final_map, neutral_snps_map, clumped_snps_map, sample_num, studySnps


def txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, studySnps):
    # Loop through every disease/study in the txt nested dictionary
    isFirst = True
    for (trait, studyID) in txtObj:
        oddsRatios = [] # holds the oddsRatios used for calculation
        sampSnps = set() # keep track of the viable snps each sample has
        # study info
        citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
        reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
        # Output Sets
        unmatchedAlleleVariants = neutral_snps_map[(trait, studyID)]
        clumpedVariants= clumped_snps_map[(trait, studyID)]
        protectiveVariants = set()
        # Certain studies have duplicate snps with varying p-value annotations. We make mark of that in the output
        if 'traitsWithDuplicateSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys():
            mark = True
        else:
            mark = False

        # Loop through each snp associated with this disease/study
        for snp in txtObj[(trait, studyID)]:
            # Also iterate through each of the alleles
            for allele in txtObj[(trait, studyID)][snp]:
                # Then compare to the gwa study
                if allele != "":
                    if snp in tableObjDict['associations']:
                        if trait in tableObjDict['associations'][snp]['traits'] and studyID in tableObjDict['associations'][snp]['traits'][trait]:
                            # Compare the individual's snp and allele to the study row's snp and risk allele
                            riskAllele = tableObjDict['associations'][snp]['traits'][trait][studyID]['riskAllele']
                            oddsRatio = tableObjDict['associations'][snp]['traits'][trait][studyID]['oddsRatio']

                            if allele == riskAllele:
                                sampSnps.add(snp)
                                oddsRatios.append(oddsRatio)
                                if oddsRatio < 1:
                                    protectiveVariants.add(snp)
                                elif oddsRatio > 1:
                                    riskVariants.add(snp)
                            elif allele != riskAllele:
                                unmatchedAlleleVariants.add(snp)

        if not isCondensedFormat:
            prs, printStudyID, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
            header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Odds Ratio', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
            newLine = [printStudyID, citation, reportedTrait, trait, prs, str(protectiveVariants), str(riskVariants), str(unmatchedAlleleVariants), str(clumpedVariants)]
            formatCSV(isFirst, newLine, header, outputFile)
            isFirst = False

        if isCondensedFormat:
            prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark, None, None, None, None)
            header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score']
            newLine = [printStudyID, citation, reportedTrait, trait, prs]
            formatCSV(isFirst, newLine, header, outputFile)
            isFirst = False


def vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, studySnps):
    condensed_output_map = {}
    count_map = {}
    samp_set = {}
    # For every sample in the vcf nested dictionary
    isFirst = True
    for (trait, studyID, samp) in vcfObj:
        if studyID in tableObjDict['studyIDsToMetaData'].keys():
            oddsRatios = [] # For storing the oddsRatios used in calculation
            sampSnps = set() # To keep track of the viable snps for each sample
            # study info
            citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
            reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
            # Output Sets
            unmatchedAlleleVariants = neutral_snps_map[(trait, studyID, samp)]
            clumpedVariants = clumped_snps_mp[(trait, studyID, samp)]
            protectiveVariants = set()
            riskVariants = set()
            # some studies have duplicate snps with varying pvalue annotations. we keep track of that here.
            mark = True if 'traitsWithDuplicateSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() else False

            # Loop through each snp associated with this disease/study/sample
            for rsID in vcfObj[(trait, studyID, samp)]:
                if rsID in tableObjDict['associations']:
                    if trait in tableObjDict['associations'][rsID]['traits'] and studyID in tableObjDict['associations'][rsID]['traits'][trait]:
                        riskAllele = tableObjDict['associations'][rsID]['traits'][trait][studyID]['riskAllele']
                        oddsRatio = tableObjDict['associations'][rsID]['traits'][trait][studyID]['oddsRatio']

                        if (studyID, trait) not in condensed_output_map and isCondensedFormat:
                            printStudyID = studyID + '†' if mark is True else studyID
                            condensedLine = [printStudyID, reportedTrait, trait, citation]
                            condensed_output_map[(studyID, trait)] = condensedLine
                        alleles = vcfObj[(trait, studyID, samp)][rsID]
                        if alleles != "" and alleles is not None:
                            for allele in alleles:
                                allele = str(allele)
                                if allele != "":
                                    if allele == riskAllele and oddsRatio != 0:
                                        sampSnps.add(rsID)
                                        oddsRatios.append(oddsRatio)
                                        if oddsRatio < 1:
                                            protectiveVariants.add(rsID)
                                        elif oddsRatio > 1:
                                            riskVariants.add(rsID)
                                    elif oddsRatio != 0:
                                        unmatchedAlleleVariants.add(rsID)

            if not isCondensedFormat:
                prs, printStudyID, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                newLine = [samp, studyID, citation, reportedTrait, trait, prs, str(protectiveVariants), str(riskVariants), str(unmatchedAlleleVariants), str(clumpedVariants)]
                header = ['Sample', 'Study ID', 'Citation', 'Reported Trait', 'Trait', 'Odds Ratios', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
                formatCSV(isFirst, newLine, header, outputFile)
                isFirst = False

            if isCondensedFormat:
                prs, printStudyID, = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark, None, None, None, None)
                if (studyID, trait) in condensed_output_map:
                    newLine = condensed_output_map[(studyID, trait)]
                    newLine.append(prs)
                    samp_set[samp] = None
                elif studyID in tableObjDict['studyIDsToMetaData']:
                    newLine = [printStudyID, reportedTrait, trait, citation, 'NF']
                    condensed_output_map[(studyID, trait)] = newLine
                    samp_set[samp] = None
                else:
                    print('YOU STILL CANNOT ACCESS STUDYID', studyID)

                if (studyID, trait) in count_map:
                    samp_count = count_map[(studyID, trait)]
                    samp_count += 1
                else:
                    samp_count = 1
                
                if samp_count == samp_num:
                    header = ['Study ID', 'Reported Trait', 'Trait', 'Citation']
                    if isFirst:
                        for samp in samp_set.keys():
                            header.append(samp)
                    del condensed_output_map[(studyID, trait)]
                    if (studyID, trait) in count_map:
                        del count_map[(studyID, trait)]
                    formatCSV(isFirst, newLine, header, outputFile)
                    isFirst = False
                else:
                    condensed_output_map[(studyID, trait)] = newLine
                    count_map[(studyID, trait)] = samp_count
        else: 
            print("WE ARE MISSING A STUDYID IN THE STUDYIDSTOMETADATA", studyID, trait)

    return


def createMarks(oddsRatios, studyID, studySnps, sampSnps, mark, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants):
    prs = str(getPRSFromArray(oddsRatios))
    # Add an * to scores that don't include every snp in the study
    if studySnps[studyID] != sampSnps and len(sampSnps) != 0:
        prs = prs + '*'
    # Add a mark to studies that have duplicate snps with varying pvalue annotations
    if mark is True:
        studyID = studyID + '†'
    # label any variant set as 'none' if it's empty
    if protectiveVariants is not None:
        if len(protectiveVariants) == 0:
            protectiveVariants = "None"
        elif len(riskVariants) == 0:
            riskVariants = "None"
        elif len(unmatchedAlleleVariants) == 0:
            unmatchedAlleleVariants = "None"
        elif len(clumpedVariants) == 0:
            clumpedVariants == "None"

        return prs, studyID, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants
    else:
        return prs, studyID


def getPRSFromArray(oddsRatios):
    combinedOR = 0
    for oratio in oddsRatios:
        oratio = float(oratio)
        combinedOR += math.log(oratio)
    combinedOR = math.exp(combinedOR)
    combinedOR = round(combinedOR, 3)
    if not oddsRatios:
        combinedOR = "NF"
    return(str(combinedOR))


def formatCSV(isFirst, newLine, header, outputFile):
    if isFirst:
        with open(outputFile, 'w', newline='', encoding="utf-8") as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(header)
            output.writerow(newLine)
    else:
        with open(outputFile, 'a', newline='', encoding="utf-8") as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(newLine)
    return
