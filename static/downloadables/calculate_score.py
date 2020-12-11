import sys
import vcf
import zipfile
import tarfile
import gzip
from collections import defaultdict
from collections import namedtuple
import json
import math
import csv
import pandas
 

def calculateScore(inputFile, pValue, outputType, tableObjDict, clumpsObjDict, refGen, isCondensedFormat, outputFile):
    output = open('aaa', 'w')
    tableObjDict = json.loads(tableObjDict)
    clumpsObjDict = json.loads(clumpsObjDict)

    # tells us if we were passed rsIDs or a vcf
    isRSids = True if inputFile.lower().endswith(".txt") else False

    if isRSids:
        txtObj, totalVariants, neutral_snps = parse_txt(inputFile, clumpsObjDict, tableObjDict)
        results = txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps, outputFile) #TODO this fuction still needs to be formatted for the new stuff
    else:
        vcfObj, totalVariants, neutral_snps, samp_num = parse_vcf(inputFile, clumpsObjDict, tableObjDict)
        results = vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps, outputFile, samp_num) #TODO this fuction still needs to be formatted for the new stuff
    return(results)


def parse_txt(txtFile, clumpsObjDict, tableObjDict):
    totalLines = 0
    openFile = open(txtFile, 'r')
    
    Lines = openFile.readlines()

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a set to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_set = set()

    # Create a dictionary of studyIDs to neutral snps
    neutral_snps = {}

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
            if snp in tableObjDict['associations']:
                for trait in tableObjDict['associations'][snp]['traits'].keys():
                    for studyID in tableObjDict['associations'][snp]['traits'][trait].keys():
                        trait_study = (trait, studyID)
                        if studyID in neutral_snps:
                            neutral_snps_set = neutral_snps[trait_study]
                        else:
                            neutral_snps_set = set()
                        # Check to see if the snp position from this line in the file exists in the clump table
                        if snp in clumpsObjDict:
                            # Grab the clump number associated with this snp 
                            clumpNum = clumpsObjDict[snp]['clumpNum']
                            pValue = tableObjDict['associations'][snp]['traits'][trait][studyID]['pValue']
                            # Add the studyID to the counter list because we now know at least there is
                            # at least one viable snp for this study
                            counter_set.add(trait_study)
                            totalLines += 1

                            # Check if the studyID has been used in the index snp map yet
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
                                        neutral_snps_set.add(index_snp)
                                    else:
                                        neutral_snps_set.add(snp)
                                else:
                                    # Since the clump number for this snp position and studyID
                                    # doesn't already exist, add it to the index map and the sample map
                                    index_snp_map[trait_study][clumpNum] = snp
                                    sample_map[trait_study][snp] = alleles
                            else:
                                # Since the trait_study wasn't already used in the index map, add it to both the index and sample map
                                index_snp_map[trait_study][clumpNum] = snp
                                sample_map[trait_study][snp] = alleles
                        # The snp wasn't in the clump map (meaning it wasn't i 1000 Genomes), so add it
                        else:
                            sample_map[trait_study][snp] = alleles
                            counter_set.add(trait_study)

                        neutral_snps[trait_study] = neutral_snps_set

    for study in tableObjDict['studyIDsToMetaData']:
        for trait in tableObjDict['studyIDsToMetaData'][study]['traits']:
            if (trait, study) not in counter_set:
                sample_map[(trait, study)][""] = ""

    openFile.close()
    final_map = dict(sample_map)
    return final_map, totalLines, neutral_snps


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


def formatAndReturnGenotype(genotype, gt, REF, ALT):
    if genotype != "./." and genotype != ".|." and genotype !="..":
        count = 0
        alleles = []
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
                alleles = gt.split('/')
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
                alleles = list(gt)
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

    return alleles


def parse_vcf(inputFile, clumpsObjDict, tableObjDict):
    totalLines = 0 

    vcf_reader = openFileForParsing(inputFile)
    
    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a list to keep track of which study/samples have viable snps and which ones don't 
    counter_set = set()
    neutral_snps = {}
    sample_set = set()

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
                        # Loop through each study containing the position
                        for study in tableObjDict['associations'][rsID]['traits'][trait].keys():

                            # Loop through each sample of the vcf file
                            for call in record.samples:  
                                gt = call.gt_bases    
                                name = call.sample
                                genotype = record.genotype(name)['GT']
                                alleles = formatAndReturnGenotype(genotype, gt, REF, ALT)
                                neutral_snps_set = set()
                                # Create a tuple with the study and sample name
                                trait_study_sample = (trait, study, name)
                                sample_set.add(name) 
                                counter_set.add(trait_study_sample)
                                # Check to see if the snp position from this line in the vcf exists in the clump table for this study
                                if rsID in clumpsObjDict:
                                    # Grab the clump number associated with this study and snp position
                                    clumpNum = clumpsObjDict[rsID]['clumpNum'] 

                                    # grab pValue from PRSBK database data
                                    pValue = tableObjDict['associations'][rsID]['traits'][trait][study]['pValue']
                                    # Add the study/sample tuple to the counter list because we now know at least there is
                                    # at least one viable snp for this combination 
                                    totalLines += 1
                                    
                                    if trait_study_sample in index_snp_map:
                                        # if the clump number for this snp position and study/name is alraedy in the index map, move forward
                                        if clumpNum in index_snp_map[trait_study_sample]:
                                            # Check whether the existing index snp or current snp have a lower pvalue for this study
                                            # and switch out the data accordingly
                                            # if the current snp position has no alleles, do not add it to the maps
                                            # if the existing index snp has no alleles, put in the current snp even if the pvalue is higher
                                            index_snp = index_snp_map[trait_study_sample][clumpNum]
                                            index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study]['pValue'] 
                                            if pValue < index_pvalue:
                                                del index_snp_map[trait_study_sample][clumpNum]
                                                index_snp_map[trait_study_sample][clumpNum] = rsID
                                                del sample_map[trait_study_sample][index_snp]
                                                sample_map[trait_study_sample][rsID] = alleles
                                                neutral_snps_set.add(index_snp)
                                                    
                                            #TODO: Do we even want to look at snps that don't have corresponding alleles?
                                            # I changed it so that we skip over snps that have "" as their alleles.
                                            elif pValue > index_pvalue and alleles != "":
                                                if sample_map[trait_study_sample][index_snp] == "":
                                                    del index_snp_map[trait_study_sample][clumpNum]
                                                    index_snp_map[trait_study_sample][clumpNum] = rsID
                                                    del sample_map[trait_study_sample][index_snp]
                                                    sample_map[trait_study_sample][rsID] = alleles
                                                    neutral_snps_set.add(index_snp)
                                                else:
                                                    neutral_snps_set.add(rsID)
                                            else:
                                                neutral_snps_set.add(rsID)
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
                                neutral_snps[trait_study_sample] = neutral_snps_set
        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        # TODO: might need a better way to handle this
        for name in vcf_reader.samples:
            for key in tableObjDict['associations'].keys():
                if ("rs" in key):
                    for trait in tableObjDict['associations'][key]['traits'].keys():
                        for study in tableObjDict['associations'][key]['traits'][trait].keys():
                            if (trait,study,name) not in counter_set:
                                sample_map[(trait,study,name)][""] = ""
    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")


    sample_num = len(sample_set)
    final_map = dict(sample_map)
    return final_map, totalLines, neutral_snps, sample_num


def txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps, outputFile):
    # Loop through every disease/study in the txt nested dictionary
    isFirst = True
    for (trait, studyID) in txtObj:
        # If it so happens that there are no snps from this study in this sample, the variant positions for the study_samp in the vcf object are empty strings. this will help us create the output because we need to know if there is a snp to use as the key in the table object or not
        isNoSnps = True
        oddsRatios = []
        neutral_snps_set = neutral_snps[studyID]
        protectiveAlleles = set()
        riskAlleles = set()

        
        # Loop through each snp associated with this disease/study
        for snp in txtObj[(trait, studyID)]:
            # Also iterate through each of the alleles
            for allele in txtObj[(trait, studyID)][snp]:
                # Then compare to the gwa study
                if allele != "":
                    if snp in tableObjDict['associations']:
                        if trait in tableObjDict['associations'][snp]['traits'] and studyID in tableObjDict['associations'][snp]['traits'][trait]:
                            # Compare the individual's snp and allele to the study row's snp and risk allele
                            citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
                            reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
                            riskAllele = tableObjDict['associations'][snp]['traits'][trait][studyID]['riskAllele']
                            oddsRatio = tableObjDict['associations'][snp]['traits'][trait][studyID]['oddsRatio']

                            if allele == riskAllele:
                                oddsRatios.append(oddsRatio)
                                if oddsRatio < 1:
                                    protectiveAlleles.add(snp)
                                elif oddsRatio > 1:
                                    riskAlleles.add(snp)
                                else:
                                    neutral_snps_set.add(snp)
                            elif allele != riskAllele:
                                neutral_snps_set.add(snp)

        if not isCondensedFormat:
            OR = str(getCombinedORFromArray(oddsRatios))
            header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Odds Ratio', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
            if str(protectiveAlleles) == "set()":
                protectiveAlleles = "None"
            elif str(riskAlleles) == "set()":
                riskAlleles = "None"
            elif str(neutral_snps_set) == "set()":
                neutral_snps_set = "None"

            if isNoSnps:
                newLine = [studyID, tableObjDict['studyIDsToMetaData'][studyID]['citation'], tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait'], trait, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
            else:
                newLine = [studyID, citation, reportedTrait, trait, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]

            formatCSV(isFirst, newLine, header, outputFile)
            isFirst = False

        if isCondensedFormat:
            OR = str(getCombinedORFromArray(oddsRatios))
            header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score']
            if isNoSnps:
                newLine = [studyID, tableObjDict['studyIDsToMetaData'][studyID]['citation'], tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait'], trait, OR]
            else:
                newLine = [studyID, citation, reportedTrait, trait, OR]
            formatCSV(isFirst, newLine, header, outputFile)
            isFirst = False


def vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps, outputFile, samp_num):
    condensed_output_map = {}
    count_map = {}
    samp_set = {}
    # For every sample in the vcf nested dictionary
    isFirst = True
    for (trait, studyID, samp) in vcfObj:
        # If it so happens that there are no snps from this study and trait in this sample, we will just grab ... TODO This part needs to be updated 
        if studyID in tableObjDict['studyIDsToMetaData'].keys():
            isNoSnps = True
            oddsRatios = []
            if (trait, studyID, samp) in neutral_snps:
                neutral_snps_set = neutral_snps[(trait, studyID, samp)]
            else:
                neutral_snps_set = set()
            protectiveAlleles = set()
            riskAlleles = set()

            # Loop through each snp associated with this disease/study/sample
            for rsID in vcfObj[(trait, studyID, samp)]:
                if rsID in tableObjDict['associations'] and rsID != '': #(second half is because the tableObjDict has a key that is "" - not sure why, will have to look into it - but just skip it for now)
                    isNoSnps = False
                    if trait in tableObjDict['associations'][rsID]['traits'] and studyID in tableObjDict['associations'][rsID]['traits'][trait]:
                        citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
                        reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
                        riskAllele = tableObjDict['associations'][rsID]['traits'][trait][studyID]['riskAllele']
                        oddsRatio = tableObjDict['associations'][rsID]['traits'][trait][studyID]['oddsRatio']

                        if (studyID, trait) not in condensed_output_map and isCondensedFormat:
                            condensedLine = [studyID, reportedTrait, trait, citation]
                            condensed_output_map[(studyID, trait)] = condensedLine
                        alleles = vcfObj[(trait, studyID, samp)][rsID]
                        if alleles != "" and alleles is not None:
                            for allele in alleles:
                                allele = str(allele)
                                if allele != "":
                                    if allele == riskAllele:
                                        oddsRatios.append(oddsRatio)
                                        if oddsRatio < 1:
                                            protectiveAlleles.add(rsID)
                                        elif oddsRatio > 1:
                                            riskAlleles.add(rsID)
                                        else:
                                            neutral_snps_set.add(rsID)
                                    else:
                                        neutral_snps_set.add(rsID)
                    else: 
                        print("WE ARE MISSING A STUDYID IN THE STUDYIDSTOMETADATA", studyID, trait)
                elif rsID != "":
                    neutral_snps_set.add(rsID)

            if not isCondensedFormat:
                OR = str(getCombinedORFromArray(oddsRatios))
                if len(protectiveAlleles) == 0:
                    protectiveAlleles = "None"
                if len(riskAlleles) == 0:
                    riskAlleles = "None"
                if len(neutral_snps_set) == 0:
                    neutral_snps_set = "None"

                if isNoSnps:
                    newLine = [samp, studyID, tableObjDict['studyIDsToMetaData'][studyID]['citation'], tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait'], trait, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
                else:
                    newLine = [samp, studyID, citation, reportedTrait, trait, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
                header = ['Sample', 'Study ID', 'Citation', 'Reported Trait', 'Trait', 'Odds Ratios', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
                formatCSV(isFirst, newLine, header, outputFile)
                isFirst = False

            if isCondensedFormat:
                if (studyID, trait) in condensed_output_map:
                    newLine = condensed_output_map[(studyID, trait)]
                    newLine.append(str(getCombinedORFromArray(oddsRatios)))
                    samp_set[samp] = None
                elif studyID in tableObjDict['studyIDsToMetaData']:
                    citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
                    reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
                    newLine = [studyID, reportedTrait, trait, citation, 'NF']
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
                    del count_map[(studyID, trait)]
                    formatCSV(isFirst, newLine, header, outputFile)
                    isFirst = False
                else:
                    condensed_output_map[(studyID, trait)] = newLine
                    count_map[(studyID, trait)] = samp_count

    # TODO: We may not need this anymore...
    #if isCondensedFormat:
        #formatCondensedCSV(condensed_output_map, outputFile, samples)
    return


def getCombinedORFromArray(oddsRatios):
    combinedOR = 0
    for oratio in oddsRatios:
        oratio = float(oratio)
        combinedOR += math.log(oratio)
    combinedOR = math.exp(combinedOR)
    combinedOR = round(combinedOR, 3)
    if not oddsRatios:
        combinedOR = "NF"
    return(str(combinedOR))


#def formatCondensedCSV(output_map, outputFile, samples):
#    header = "study ID\tReportedTrait\tTrait\tCitation"
#    samps = '\t'.join(samples.keys())
#    header = header + '\t' + str(samps)
#    content = ""
#    isFirst = True
#    for studyID in output_map:
#        newLine = output_map[studyID]
#        stringNewLine = '\t'.join(newLine)
#        if isFirst:
#            content += stringNewLine
#            isFirst = False
#        else:
#            content = content + '\n' + stringNewLine
#    finalOutput = header + '\n' + content
#
##    header = ["study ID", "Reported Trait", "Trait", "Citation"]
#    with open(outputFile, 'w', newline='', encoding="utf-8") as f:
#        f.write(finalOutput)
#    return


def formatCSV(isFirst, newLine, header, outputFile):
    if isFirst:
        with open(outputFile, 'w', newline='') as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(header)
            output.writerow(newLine)
    else:
        with open(outputFile, 'a', newline='') as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(newLine)
    return
