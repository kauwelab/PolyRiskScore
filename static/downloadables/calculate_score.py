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

def calculateScore(snpSet, parsedObj, tableObjDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, study, isFirstUsed, isFirstUnused, isRSids):
    if isRSids:
        isFirstUsed, isFirstUnused = txtcalculations(snpSet, parsedObj, tableObjDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, unusedTraitStudy, trait, study, isFirstUsed, isFirstUnused)
    else:
        isFirstUsed, isFirstUnused = vcfcalculations(snpSet, parsedObj, tableObjDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, study, isFirstUsed, isFirstUnused)
    return isFirstUsed, isFirstUnused


def txtcalculations(snpSet, txtObj, tableObjDict, isJson, isCondensedFormat, unmatchedAlleleVariants, clumpedVariants, outputFile, unusedTraitStudy, trait, studyID, isFirstUsed, isFirstUnused):
    header = []
    if isCondensedFormat:
        header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score']
    else:
        header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']

    # if none of the snps in the input file match with the filtered database
    #if isNoStudies:
    #    outputHeaderAndQuit(inputInFilters, header, outputFile)
    #else:
    if unusedTraitStudy:
        isFirstUnused = printUnusedTraitStudyPairs(trait, studyID, outputFile, isFirstUnused)

    else:
        if studyID in tableObjDict['studyIDsToMetaData'].keys():
            # study info
            citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
            reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
            oddsRatios = [] # holds the oddsRatios used for calculation
            sampSnps = set() # keep track of the viable snps each sample has
            # Output Sets
            protectiveVariants = set()
            riskVariants = set()
            # Certain studies have duplicate snps with varying p-value annotations. We make mark of that in the output
            if 'traitsWithDuplicateSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys():
                mark = True
            else:
                mark = False

            json_study_results = {}

            for snp in txtObj:
                # Also iterate through each of the alleles
                if snp in snpSet:
                    for allele in txtObj[snp]:
                        # Then compare to the gwa study
                        if allele != "":
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
                            else:
                                unmatchedAlleleVariants.add(snp)

            if not isCondensedFormat and not isJson:
                prs, printStudyID = createMarks(oddsRatios, studyID, snpDict, sampSnps, mark)
                protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                newLine = [printStudyID, citation, reportedTrait, trait, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                formatTSV(isFirstUsed, newLine, header, outputFile)
                isFirstUsed = False
                
            elif isJson:
                # Add needed markings to scores/studies
                prs, printStudyID = createMarks(oddsRatios, studyID, snpSet, sampSnps, mark)

                json_study_results.update({
                    'studyID': printStudyID,
                    'citation': citation,
                    'reportedTrait': reportedTrait,
                    'trait': trait,
                    'polygenicRiskScore': prs,
                    'protectiveVariants': "|".join(protectiveVariants),
                    'riskVariants': "|".join(riskVariants),
                    'variantsWithoutRiskAllele': "|".join(unmatchedAlleleVariants),
                    'variantsInHighLD': "|".join(clumpedVariants)
                })

                formatJson(isFirstUsed, json_study_results, outputFile)
                isFirstUsed = False
                json_study_results = {}

            elif isCondensedFormat:
                prs, printStudyID = createMarks(oddsRatios, studyID, snpSet, sampSnps, mark)
                newLine = [printStudyID, citation, reportedTrait, trait, prs]
                formatTSV(isFirstUsed, newLine, header, outputFile)
                isFirstUsed = False
        else:
            raise SystemExit("ERROR: A study ID was missing from our metadata. Please report this to the PRSKB team along with the command you used to run the program.", studyID, trait)

    return isFirstUsed, isFirstUnused
    


def vcfcalculations(snpSet, vcfObj, tableObjDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, unusedTraitStudy, trait, studyID, isFirstUsed, isFirstUnused):
    header = []
    if isCondensedFormat:
        header = ['Study ID', 'Reported Trait', 'Trait', 'Citation']
        for samp in vcfObj:
            header.append(samp)
    else:
        header = ['Sample', 'Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
    
    #TODO: figure out how to create output if none of the snps in the input file match with the filtered database
    #if isNoStudies:
    #    if isCondensedFormat:
    #        for samp in vcfObj:
    #            header.append(samp)
    #    outputHeaderAndQuit(inputInFilters, header, outputFile)
    #else:
    # TODO: check this
    if unusedTraitStudy:
        isFirstUnused = printUnusedTraitStudyPairs(trait, studyID, outputFile, isFirstUnused)

    else:
        samp_count = 0
        json_study_results = {}
        json_samp_list = []
        count_map = {}
        samp_set = {}

        # For every sample in the vcf nested dictionary
        for samp in vcfObj:
            samp_count += 1
            # check if the study exists in the studyMetaData
            if studyID in tableObjDict['studyIDsToMetaData'].keys():
                oddsRatios = [] # For storing the oddsRatios used in calculation
                sampSnps = set() # To keep track of the viable snps for each sample
                # study info
                citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
                reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
                # Output Sets
                unmatchedAlleleVariants = neutral_snps_map[samp] if samp in neutral_snps_map.keys() else set()
                clumpedVariants = clumped_snps_map[samp] if samp in clumped_snps_map.keys() else set()
                protectiveVariants = set()
                riskVariants = set()
                # some studies have duplicate snps with varying pvalue annotations. we keep track of that here.
                mark = True if 'traitsWithDuplicateSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() else False
                # Loop through each snp associated with this disease/study/sample
                for rsID in vcfObj[samp]:
                    if rsID in snpSet:
                        pValue = tableObjDict['associations'][rsID]['traits'][trait][studyID]['pValue']
                        riskAllele = tableObjDict['associations'][rsID]['traits'][trait][studyID]['riskAllele']
                        oddsRatio = tableObjDict['associations'][rsID]['traits'][trait][studyID]['oddsRatio']
                        alleles = vcfObj[samp][rsID]
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

                if not isCondensedFormat and not isJson:
                    prs, printStudyID = createMarks(oddsRatios, studyID, snpDict, sampSnps, mark)
                    protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                    newLine = [samp, studyID, citation, reportedTrait, trait, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                    formatTSV(isFirstUsed, newLine, header, outputFile)
                    isFirstUsed = False

                #TODO: work on the json format
                elif isJson:
                    # Add needed markings to score and study
                    prs, printStudyID = createMarks(oddsRatios, studyID, snpSet, sampSnps, mark)
                    
                    # if this is the first sample for this study/trait combo, add the study information first
                    if samp_count == 0:
                        json_study_results.update({
                            'studyID': printStudyID,
                            'citation': citation,
                            'reportedTrait': reportedTrait,
                            'trait': trait
                        })

                        json_sample_results.update({
                            'sample': samp,
                            'polygenicRiskScore': prs,
                            'protectiveAlleles': "|".join(protectiveVariants),
                            'riskAlleles': "|".join(riskVariants),
                            'variantsWithoutRiskAllele': "|".join(unmatchedAlleleVariants),
                            'variantsInHighLD': "|".join(clumpedVariants)
                        })
                        
                        json_samp_list.append(sample_results) # Add this sample's results to a list of sample results for this study/trait

                        # check if scores for all the samples have been calculated
                        if samp_count == samp_num:
                            json_study_results.update({'samples': json_samp_list})
                            # TODO: check to see if there's a way to just add the sample's info right away, rather than wait for all the samples to be calculated first
                            formatJson(isFirstUsed, json_study_results, outputFile)
                            isFirstUsed = False
                            json_study_results = {}
                            json_samp_list = []
                
                elif isCondensedFormat:
                    prs, printStudyID = createMarks(oddsRatios, studyID, snpSet, sampSnps, mark)

                    if samp_count == 1:
                        newLine = [printStudyID, reportedTrait, trait, citation]
                    newLine.append(prs)
                    
                    if samp_count == samp_num:
                        formatTSV(isFirstUsed, newLine, header, outputFile)
                        isFirstUsed = False
                    
            else:
                #TODO have this report directly to the PRSKB server
                raise SystemExit("ERROR: A study ID was missing from the our metadata. Please report this to the PRSKB team along with the command you used to run the program.", studyID, trait)

    return isFirstUsed, isFirstUnused

# handles txtcalculations and vcfcalculations error if isNoStudies is True and/or inputInFilters is false
# the header is printed to the outputfile, an error is printed, and the program quits
def outputHeaderAndQuit(inputInFilters, header, outputFile):
    # TODO if inputInFilters is false, print out all snps that weren't in the filtered database to the output file so there isn't an error
    formatTSV(True, [], header, outputFile)
    if not inputInFilters:
        raise SystemExit("WARNING: None of the SNPs specified in the input file match the SNPs given by the specified filters. Check your input file and your filters and try again.")
    else:
        raise SystemExit("WARNING: None of the studies in the PRSKB database match the specified filters. Check your filters and try again.")


def formatJson(isFirst, studyInfo, outputFile):
    json_output=[]
    json_output.append(studyInfo)
    if isFirst:
        with open(outputFile, 'w', newline='') as f:
            json.dump(json_output, f, indent=4)
    else:
        with open(outputFile, 'r+', newline = '') as f:
            f.seek(0,2)
            position = f.tell() -1
            f.seek(position)
            f.write( ",{}]".format(json.dumps(studyInfo, indent=4)))
    return


def createMarks(oddsRatios, studyID, snpSet, sampSnps, mark):
    prs = str(getPRSFromArray(oddsRatios))
    # Add an * to scores that don't include every snp in the study
    #TODO: check this
    if snpSet != sampSnps and len(sampSnps) != 0:
        prs = prs + '*'
    # Add a mark to studies that have duplicate snps with varying pvalue annotations
    if mark is True:
        studyID = studyID + '†'
    return prs, studyID


# prints the study/trait combos that don't have matching snps to one in the input file
def printUnusedTraitStudyPairs(trait, study, outputFile, isFirstUnused):
    fileBasename = os.path.basename(outputFile)
    fileDirname = os.path.dirname(outputFile)
    fileName, ext = os.path.splitext(fileBasename)
    fileBasename = fileName + "_studiesNotIncluded.txt"
    completeOutputFileName = os.path.join(fileDirname, fileBasename)

    # if the folder of the output file doesn't exist, create it
    if "/" in completeOutputFileName:
        os.makedirs(os.path.dirname(completeOutputFileName), exist_ok=True)

    if isFirstUnused:
        openFile = open(completeOutputFileName, "w")
        openFile.write("Trait/Study combinations with no matching snps in the input file:")
        isFirstUnused = False
    else:
        openFile = open(completeOutputFileName, 'a')
    openFile.write('\n')
    openFile.write(str(trait))
    openFile.write(', ')
    openFile.write(str(study))
    
    openFile.close()

    return isFirstUnused


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


def formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants):
    protectiveVariants = "." if str(protectiveVariants) == "set()" else "|".join(protectiveVariants)
    riskVariants = "." if str(riskVariants) == "set()" else "|".join(riskVariants)
    unmatchedAlleleVariants = "." if str(unmatchedAlleleVariants) == "set()" else "|".join(unmatchedAlleleVariants)
    clumpedVariants = "." if str(clumpedVariants) == "set()" else "|".join(clumpedVariants)

    return protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants


def formatTSV(isFirstUsed, newLine, header, outputFile):
    # if the folder of the output file doesn't exist, create it
    if "/" in outputFile:
        os.makedirs(os.path.dirname(outputFile), exist_ok=True)

    if isFirstUsed:
        with open(outputFile, 'w', newline='', encoding="utf-8") as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(header)
            output.writerow(newLine)
    else:
        with open(outputFile, 'a', newline='', encoding="utf-8") as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(newLine)
    return

