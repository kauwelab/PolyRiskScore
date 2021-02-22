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

def calculateScore(inputFile, pValue, outputType, tableObjDict, clumpsObjDict, refGen, isCondensedFormat, isJson, outputFile, traits, studyTypes, studyIDs, ethnicities):
    

    

    

    if isRSids:
        txtObj, neutral_snps_map, clumped_snps_map, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs = parse_txt(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
        txtcalculations(tableObjDict, txtObj, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs)
    else:
        vcfObj, neutral_snps_map, clumped_snps_map, samp_num, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs = parse_vcf(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
        vcfcalculations(tableObjDict, vcfObj, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs)
    return













def txtcalculations(tableObjDict, txtObj, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs):
    header = []
    if isCondensedFormat:
        # this header has samples added onto the end later
        header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score']
    else:
        header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']

    # if none of the snps in the input file match with the filtered database
    if isNoStudies:
        outputHeaderAndQuit(inputInFilters, header, outputFile)
    else:
        # Loop through every disease/study in the txt nested dictionary
        isFirst = True

        # TODO: should we print this here or wait till later?
        printUnusedTraitStudyPairs(unusedTraitStudyPairs, outputFile)

        trait_study_keys = list(txtObj.keys())
        trait_study_keys.sort()

        for i in range(len(trait_study_keys)):
            trait, studyID = trait_study_keys[i]
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
                                else:
                                    unmatchedAlleleVariants.add(snp)

            if not isCondensedFormat and not isJson:
                prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark)
                header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
                protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                newLine = [printStudyID, citation, reportedTrait, trait, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                formatTSV(isFirst, newLine, header, outputFile)
                isFirst = False
                
            elif isJson:
                # Add needed markings to scores/studies
                prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark)
                study_results = {}
                study_results.update({
                    'studyID':printStudyID,
                    'citation':citation,
                    'reportedTrait':reportedTrait,
                    'trait':trait,
                    'polygenicRiskScore': prs,
                    'protectiveVariants':"|".join(protectiveVariants),
                    'riskVariants': "|".join(riskVariants),
                    'variantsWithoutRiskAlleles': "|".join(unmatchedAlleleVariants),
                    'variantsInHighLD': "|".join(clumpedVariants)
                })
                formatJson(isFirst, study_results, outputFile)
                isFirst = False
                del study_results

            elif isCondensedFormat:
                prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark)
                header = ['Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score']
                newLine = [printStudyID, citation, reportedTrait, trait, prs]
                formatTSV(isFirst, newLine, header, outputFile)
                isFirst = False


def vcfcalculations(tableObjDict, vcfObj, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs):
    header = []
    if isCondensedFormat:
        # this header has samples added onto the end later
        header = ['Study ID', 'Reported Trait', 'Trait', 'Citation']
    else:
        header = ['Sample', 'Study ID', 'Citation', 'Reported Trait', 'Trait', 'Polygenic Risk Score', 'Protective Variants', 'Risk Variants', 'Variants Without Risk Allele', 'Variants in High LD']
    
    # if none of the snps in the input file match with the filtered database
    if isNoStudies:
        if isCondensedFormat:
            for samp in vcfObj:
                header.append(samp)
        outputHeaderAndQuit(inputInFilters, header, outputFile)
    else:
        # TODO: should we print this here or wait till later?
        printUnusedTraitStudyPairs(unusedTraitStudyPairs, outputFile)

        study_results_map = {}
        sample_results_map = {}
        condensed_output_map = {}
        count_map = {}
        samp_set = {}

        isFirst = True
        trait_study_sample_keys = list(vcfObj.keys())
        trait_study_sample_keys.sort()

        # For every sample in the vcf nested dictionary
        for i in range(len(trait_study_sample_keys)):
            trait, studyID, samp = trait_study_sample_keys[i]
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
                                        if allele == riskAllele:
                                            sampSnps.add(rsID)
                                            oddsRatios.append(oddsRatio)
                                            if oddsRatio < 1:
                                                protectiveVariants.add(rsID)
                                            elif oddsRatio > 1:
                                                riskVariants.add(rsID)
                                        else:
                                            unmatchedAlleleVariants.add(rsID)

                if not isCondensedFormat and not isJson:
                    prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark)
                    protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                    newLine = [samp, studyID, citation, reportedTrait, trait, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                    formatTSV(isFirst, newLine, header, outputFile)
                    isFirst = False

                elif isJson:
                    # Add needed markings to score and study
                    prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark)

                    # Check to see if the studyID/trait combo has been added to the json map yet
                    if (studyID, trait) in sample_results_map:
                        samp_list = sample_results_map[(studyID, trait)] # Get the list of results for each of the samples associated with this study/trait combo
                        study_results = study_results_map[(studyID, trait)] # get the json output for this study/trait combo
                    else:
                        samp_list = []
                        study_results = {}

                    # Start a new dictionary to store the results for this sample (for this trait/study)
                    sample_results = {}
                    if len(samp_list) == 0:# If this is the first sample for this study/trait, add the study information first
                        study_results.update({
                            'studyID': printStudyID,
                            'citation': citation,
                            'reportedTrait': reportedTrait,
                            'trait': trait
                        })

                    if prs == 'NF': # Check to see if there were no viable snps from this study for this sample
                        sample_results.update({
                            'sample': samp,
                            'polygenicRiskScore': 'NF',
                        })
                    else:
                        sample_results.update({
                            'sample':samp,
                            'polygenicRiskScore':prs,
                        })
                    sample_results.update({
                            'protectiveAlleles': "|".join(protectiveVariants),
                            'riskAlleles': "|".join(riskVariants),
                            'variantsWithoutRiskAllele': "|".join(unmatchedAlleleVariants),
                            'variantsInHighLD': "|".join(clumpedVariants)
                        })
                    
                    samp_list.append(sample_results) # Add this sample's results to a list of sample results for this study/trait

                    if len(samp_list) == samp_num: # If the study has calculated scores for every sample, add the list of sample results to the json output
                        study_results.update({'samples':samp_list})
                        formatJson(isFirst, study_results, outputFile)
                        isFirst = False
                        del study_results_map[(studyID, trait)] # to not take up too much memory, delte the study/trait from the study results map
                        del sample_results_map[(studyID, trait)]
                    else:
                        sample_results_map[(studyID, trait)] = samp_list
                        study_results_map[(studyID, trait)] = study_results
                
                elif isCondensedFormat:
                    prs, printStudyID = createMarks(oddsRatios, studyID, studySnps, sampSnps, mark)
                    
                    if (studyID, trait) in condensed_output_map:
                        newLine = condensed_output_map[(studyID, trait)]
                        newLine.append(prs)
                        samp_set[samp] = None
                    elif studyID in tableObjDict['studyIDsToMetaData']:
                        newLine = [printStudyID, reportedTrait, trait, citation, 'NF']
                        condensed_output_map[(studyID, trait)] = newLine
                        samp_set[samp] = None
                    else:
                        #TODO have this report directly to the PRSKB server
                        raise SystemExit('ERROR: A study ID was inaccessable. Please report this to the PRSKB team along with the command you used to run the program.', studyID)

                    if (studyID, trait) in count_map:
                        samp_count = count_map[(studyID, trait)]
                        samp_count += 1
                    else:
                        samp_count = 1
                    
                    if samp_count == samp_num:
                        if isFirst:
                            for samp in samp_set.keys():
                                header.append(samp)
                        del condensed_output_map[(studyID, trait)]
                        if (studyID, trait) in count_map:
                            del count_map[(studyID, trait)]
                        formatTSV(isFirst, newLine, header, outputFile)
                        isFirst = False
                    else:
                        condensed_output_map[(studyID, trait)] = newLine
                        count_map[(studyID, trait)] = samp_count
            else:
                #TODO have this report directly to the PRSKB server
                raise SystemExit("ERROR: A study ID was missing from the our metadata. Please report this to the PRSKB team along with the command you used to run the program.", studyID, trait)

    return

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


def createMarks(oddsRatios, studyID, studySnps, sampSnps, mark):
    prs = str(getPRSFromArray(oddsRatios))
    # Add an * to scores that don't include every snp in the study
    if studySnps[studyID] != sampSnps and len(sampSnps) != 0:
        prs = prs + '*'
    # Add a mark to studies that have duplicate snps with varying pvalue annotations
    if mark is True:
        studyID = studyID + '†'
    return prs, studyID


# prints the study/trait combos that don't have matching snps to one in the input file
def printUnusedTraitStudyPairs(unusedTraitStudyPairs, outputFile):
    fileBasename = os.path.basename(outputFile)
    fileDirname = os.path.dirname(outputFile)
    fileName, ext = os.path.splitext(fileBasename)
    fileBasename = fileName + "_studiesNotIncluded.txt"
    completeOutputFileName = os.path.join(fileDirname, fileBasename)

    # if the folder of the output file doesn't exist, create it
    if "/" in completeOutputFileName:
        os.makedirs(os.path.dirname(completeOutputFileName), exist_ok=True)

    openFile = open(completeOutputFileName, "w")
    openFile.write("Trait/Study combinations with no matching snps in the input file:\n")
    keys = list(unusedTraitStudyPairs.keys())
    keys.sort()

    for i in range(len(keys)):
        if unusedTraitStudyPairs[keys[i]] == True:
            openFile.write(str(keys[i]))
            openFile.write("\n")
    
    openFile.close()


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


def formatTSV(isFirst, newLine, header, outputFile):
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

