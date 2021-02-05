import sys
import vcf
import zipfile
import tarfile
import gzip
from collections import defaultdict
import json
import math
import csv
import io
import os

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
    extension = getZippedFileExtension(inputFile, False)
    isRSids = True if extension.lower().endswith(".txt") or inputFile.lower().endswith(".txt") else False

    if isRSids:
        txtObj, neutral_snps_map, clumped_snps_map, studySnps, isNoStudies = parse_txt(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
        txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, studySnps, isNoStudies)
    else:
        vcfObj, neutral_snps_map, clumped_snps_map, samp_num, studySnps, isNoStudies = parse_vcf(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
        vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, studySnps, isNoStudies)
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
    totalLines = 0
    
    Lines = openFileForParsing(txtFile, True)

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a set to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_set = set()

    # Create a boolean to keep track of whether any studies pass the specified filters
    isNoStudies = True

    # Create a dictionary of studyIDs to neutral snps
    neutral_snps_map = {}
    clumped_snps_map = {}

    isAllFiltersNone = (traits is None and studyIDs is None and studyTypes is None and ethnicities is None)

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        try:
            if line != "":
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
                            studyMetaData = tableObjDict['studyIDsToMetaData'][studyID] if studyID in tableObjDict['studyIDsToMetaData'].keys() else None
                            useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait)
                        if isAllFiltersNone or useStudy:
                            isNoStudies = False
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

    if isNoStudies:
        return None, None, None, None, isNoStudies

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
                        useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
                    if isAllFiltersNone or useStudy:
                        pValue = tableObjDict['associations'][key]['traits'][trait][study]['pValue']
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
    return final_map, neutral_snps_map, clumped_snps_map, studySnps, isNoStudies


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

# returns an open file (for txt files) or a vcf.Reader (for vcf files)
# if the file is zipped (zip, tar, tgz, gz, etc), reads the file without unzipping it
# assumes the file is already validated
def openFileForParsing(inputFile, isTxtExtension):
    # if the file is zipped
    if zipfile.is_zipfile(inputFile):
        # open the file
        archive = zipfile.ZipFile(inputFile)
        validArchive = []
        # get the vcf or txt file in the zip
        for filename in archive.namelist():
            if filename[-4:].lower() == ".vcf" or filename[-4:].lower() == ".txt":
                validArchive.append(filename)
        # decode the file from the zip file
        new_file = archive.read(validArchive[0]).decode().replace("\r", "").split("\n")
    # if the file is tar zipped
    elif tarfile.is_tarfile(inputFile):
        # open the file
        archive = tarfile.open(inputFile)
        # get the vcf or txt file in the tar
        for tarInfo in archive:
            if tarInfo.name[-4:].lower() == ".vcf" or tarInfo.name[-4:].lower() == ".txt":
                # wrap the ExFileObject in an io.TextIOWrapper and read
                new_file = io.TextIOWrapper(archive.extractfile(tarInfo)).read().replace("\r", "").split("\n")
    # if file is gzipped
    elif inputFile.lower().endswith(".gz") or inputFile.lower().endswith(".gzip"):
        new_file = gzip.open(inputFile, 'rt').read().replace("\r", "").split("\n")
    else:
        # default open for regular vcf and txt files
        new_file = open(inputFile, 'r').read().replace("\r", "").split("\n")
    
    # return the new file either as is (txt) or as a vcf.Reader (vcf)
    if isTxtExtension:
        return new_file
    else:
        # open the newly unzipped file using the vcf reader
        return vcf.Reader(new_file)


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

    vcf_reader = openFileForParsing(inputFile, False)
    
    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a list to keep track of which study/samples have viable snps and which ones don't 
    counter_set = set()
    neutral_snps_map = {}
    clumped_snps_map = {}
    sample_num = len(vcf_reader.samples)

    # Create a counter to keep track if the filters result in any viable studies
    isNoStudies = True 

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
                                isNoStudies = False
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
        if isNoStudies:
            samples = []
            for name in vcf_reader.samples:
                samples.append(name)
            return samples, None, None, None, None, isNoStudies

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
    return final_map, neutral_snps_map, clumped_snps_map, sample_num, studySnps, isNoStudies


def txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, studySnps, isNoStudies):
    # Loop through every disease/study in the txt nested dictionary
    isFirst = True
    if isNoStudies:
        message = []
        if isCondensedFormat:
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation', 'Polygenic Risk Score']
        else:
            header = ['Sample', 'Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
        formatCSV(isFirst, message, header, outputFile)
        raise SystemExit("\n\n!!!NONE OF THE STUDIES IN THE DATABASE MATCH THE SPECIFIED FILTERS!!!")
    else:
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
            riskVariants = set()
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


def vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, studySnps, isNoStudies):
    if isNoStudies:
        message=[]
        if isCondensedFormat:
            header = ['Study ID', 'Reported Trait', 'Trait', 'Citation']
            for samp in vcfObj:
                header.append(samp)
        else:
            header = ['Sample', 'Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
        formatCSV(True, message, header, outputFile)
        raise SystemExit("\n\n!!!NONE OF THE STUDIES IN THE DATABASE MATCH THE SPECIFIED FILTERS!!!")
    else:
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
                clumpedVariants = clumped_snps_map[(trait, studyID, samp)]
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
    # if the folder of the output file doesn't exist, create it
    if "/" in outputFile:
        os.makedirs(os.path.dirname(outputFile), exist_ok=True)

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

# checks if the file is a vaild zipped file and returns the extension of the file inside the zipped file
# a zipped file is valid if it is a zip, tar, or gz file with only 1 vcf/txt file inside
# returns and prints: ".vcf" or "txt" if the zipped file is valid and contains one of those files
                    # "False" if the file is not a zipped file
                    # error message if the file is a zipped file, but is not vaild
def getZippedFileExtension(filePath, shouldPrint):
    # if the file is a zip file
    if zipfile.is_zipfile(filePath):
        # open the file
        archive = zipfile.ZipFile(filePath, "r")
        # get the number of vcf/txt files inside the file
        validArchive = []
        for filename in archive.namelist():
            if filename[-4:].lower() == ".vcf" or filename[-4:].lower() == ".txt":
                validArchive.append(filename)
        # if the number of vcf/txt files is one, this file is valid and the extension is printed and returned
        if len(validArchive) == 1:
            new_file = validArchive[0]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "There must be 1 vcf/txt file in the zip file. Please check the input file and try again."
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is a tar-like file (tar, tgz, tar.gz, etc.)
    elif tarfile.is_tarfile(filePath):
        # open the file
        archive = tarfile.open(filePath)
        # get the number of vcf/txt files inside the file
        validArchive = []
        for tarInfo in archive.getmembers():
            if tarInfo.name[-4:].lower() == ".vcf" or tarInfo.name[-4:].lower() == ".txt":
                validArchive.append(tarInfo.name)
        # if the number of vcf/txt files is one, this file is valid and the extension is printed and returned
        if len(validArchive) == 1:
            new_file = validArchive[0]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "There must be 1 vcf/txt file in the tar file. Please check the input file and try again."
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is a gz file (checked last to not trigger for tar.gz)
    elif filePath.lower().endswith(".gz"):
        # if the gz file is a vcf/txt file, print and return the extension
        if filePath.lower().endswith(".txt.gz") or filePath.lower().endswith(".vcf.gz"):
            new_file = filePath[:-3]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "The gzipped file is not a txt or vcf file. Please check the input file and try again"
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is not a zip, tar, or gz, print and return "False"
    else:
        printIfShould(shouldPrint, "False")
        return "False"

# prints msg if should is True
def printIfShould(should, msg):
    if should:
        print(msg)