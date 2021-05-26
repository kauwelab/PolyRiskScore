import json
import math
import csv
import os
from filelock import FileLock

def calculateScore(snpSet, parsedObj, tableObjDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, study, snpCount, isRSids, sampleOrder):
    if isRSids:
        txtcalculations(snpSet, parsedObj, tableObjDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFilePath, unusedTraitStudy, trait, study, snpCount)
    else:
        vcfcalculations(snpSet, parsedObj, tableObjDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, study, sampleOrder, snpCount)
    return


def txtcalculations(snpSet, txtObj, tableObjDict, isJson, isCondensedFormat, omitUnusedStudiesFile, unmatchedAlleleVariants, clumpedVariants, outputFile, unusedTraitStudy, trait, studyID, snpCount):

    # if this trait/study had no snps in the input file, print the trait/study to the output list
    if unusedTraitStudy and not omitUnusedStudiesFile:
        # if has traitWithDuplicateSnps, add the sign to the studyID
        if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps']:
            printStudyID = studyID + '†'
        printUnusedTraitStudyPairs(trait, printStudyID, outputFile, False)

    else:
        if studyID in tableObjDict['studyIDsToMetaData'].keys():
            # study info
            citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
            reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
            oddsRatios = [] # holds the oddsRatios used for calculation
            # Output Sets
            protectiveVariants = set()
            riskVariants = set()
            # Certain studies have duplicate snps with varying p-value annotations. We make mark of that in the output
            if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps']:
                mark = True
            else:
                mark = False

            #Add a mark to the studies that have SNPs that aren't present in the input file
            asterisk = True if len(snpSet) != snpCount else False

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
                                oddsRatios.append(oddsRatio)
                                if oddsRatio < 1:
                                    protectiveVariants.add(snp)
                                elif oddsRatio > 1:
                                    riskVariants.add(snp)
                            else:
                                unmatchedAlleleVariants.add(snp)

            if not omitUnusedStudiesFile and len(oddsRatios) == 0 and len(protectiveVariants) == 0 and len(riskVariants) == 0 and len(unmatchedAlleleVariants) == 0 and len(clumpedVariants) == 0:
                if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps']:
                    printStudyID = studyID + '†'
                    # this boolean variable will ensure that subsequent unused traits/studies are appended, not written, to the output file
                    printUnusedTraitStudyPairs(trait, printStudyID, outputFile, False)

            elif not isCondensedFormat and not isJson:
                # add needed markings to scores/studies
                prs, printStudyID = createMarks(oddsRatios, studyID, asterisk, mark)
                # Grab variant sets
                protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                # new line to add to tsv file
                newLine = [printStudyID, citation, reportedTrait, trait, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                # add new ine to tsv file
                formatTSV(False, newLine, [], outputFile)
                
            elif isJson:
                # Add needed markings to scores/studies
                prs, printStudyID = createMarks(oddsRatios, studyID, asterisk, mark)

                json_study_results = {
                    'studyID': printStudyID,
                    'citation': citation,
                    'reportedTrait': reportedTrait,
                    'trait': trait,
                    'polygenicRiskScore': prs,
                    'protectiveVariants': "|".join(protectiveVariants),
                    'riskVariants': "|".join(riskVariants),
                    'variantsWithoutRiskAllele': "|".join(unmatchedAlleleVariants),
                    'variantsInHighLD': "|".join(clumpedVariants)
                }

                # write the dictionary to a json file 
                formatJson(json_study_results, outputFile)
                json_study_results = {}

            elif isCondensedFormat:
                #add necessary study/score markings
                prs, printStudyID = createMarks(oddsRatios, studyID, asterisk, mark)
                newLine = [printStudyID, citation, reportedTrait, trait, prs]
                # write new line to tsv file
                formatTSV(False, newLine, [], outputFile)
        else:
            raise SystemExit("ERROR: A study ID was missing from our metadata. Please report this to the PRSKB team along with the command you used to run the program.", studyID, trait)

    return


def vcfcalculations(snpSet, vcfObj, tableObjDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFile, samp_num, unusedTraitStudy, trait, studyID, sampleOrder, snpCount):
    header = []

    # if the trait/study has no snps in the input file, write out the trait/study to the output list of unused traits/studies
    if unusedTraitStudy and not omitUnusedStudiesFile:
        # if has traitWithDuplicateSnps, add the sign to the studyID
        if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps']:
            printStudyID = studyID + '†'
        else:
            printStudyID = studyID
        # this boolean variable will ensure that subsequent unused traits/studies are appended, not written, to the output file
        printUnusedTraitStudyPairs(trait, printStudyID, outputFile, False)

    else:
        # keep track of the samples that have had their scores calculated so we know when to write out the condensed format line and json output
        samp_count = 0
        # json output objects
        json_study_results = {}
        json_samp_list = []
        # keep track of the unusedtraitstudies added to the supplement file
        unusedTraitStudySet = set()

        # For every sample in the vcf nested dictionary
        for samp in sampleOrder:
            samp_count += 1
            # check if the study exists in the studyMetaData
            if studyID in tableObjDict['studyIDsToMetaData'].keys():
                oddsRatios = [] # For storing the oddsRatios used in calculation
                # study info
                citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
                reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
                # Output Sets
                unmatchedAlleleVariants = neutral_snps_map[samp] if samp in neutral_snps_map.keys() else set()
                clumpedVariants = clumped_snps_map[samp] if samp in clumped_snps_map.keys() else set()
                protectiveVariants = set()
                riskVariants = set()
                # some studies have duplicate snps with varying pvalue annotations. we keep track of that here.
                mark = True if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps'] else False
                # Create a mark for the studies that have SNPs that aren't present in the input file
                asterisk = True if len(snpSet) != snpCount else False
                # Loop through each snp associated with this disease/study/sample
                if samp in vcfObj:
                    for rsID in vcfObj[samp]:
                        # check if the snp is in this trait/study
                        if rsID in snpSet:
                            pValue = tableObjDict['associations'][rsID]['traits'][trait][studyID]['pValue']
                            riskAllele = tableObjDict['associations'][rsID]['traits'][trait][studyID]['riskAllele']
                            oddsRatio = tableObjDict['associations'][rsID]['traits'][trait][studyID]['oddsRatio']
                            alleles = vcfObj[samp][rsID]
                            if alleles != "" and alleles is not None:
                                for allele in alleles:
                                    allele = str(allele)
                                    if allele != "":
                                        # check if the risk allele is in the listed alleles
                                        if allele == riskAllele and oddsRatio != 0:
                                            oddsRatios.append(oddsRatio) # add the odds ratio to the list of odds ratios used to calculate the score
                                            if oddsRatio < 1:
                                                protectiveVariants.add(rsID)
                                            elif oddsRatio > 1:
                                                riskVariants.add(rsID)
                                        elif oddsRatio != 0:
                                            unmatchedAlleleVariants.add(rsID)

                if not omitUnusedStudiesFile and len(oddsRatios) == 0 and len(protectiveVariants) == 0 and len(riskVariants) == 0 and len(unmatchedAlleleVariants) == 0 and len(clumpedVariants) == 0:
                    samp_count -= 1
                    if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps']:
                        printStudyID = studyID + '†'
                    else:
                        printStudyID = studyID
                    # check if the study/trait has already been printed to the unusedtraitstudy file. if it hasn't, print it to the file
                    if (trait, printStudyID) not in unusedTraitStudySet:
                        # this boolean variable will ensure that subsequent unused traits/studies are appended, not written, to the output file
                        printUnusedTraitStudyPairs(trait, printStudyID, outputFile, False)
                        unusedTraitStudySet.add((trait, printStudyID))

                # if the output format is verbose
                elif not isCondensedFormat and not isJson:
                    # add necessary marks to study/score
                    prs, printStudyID = createMarks(oddsRatios, studyID, asterisk, mark)
                    #grab variant sets
                    protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                    # add new line to tsv file
                    newLine = [samp, printStudyID, reportedTrait, trait, citation, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                    formatTSV(False, newLine, [], outputFile)

                elif isJson:
                    # Add needed markings to score and study
                    prs, printStudyID = createMarks(oddsRatios, studyID, asterisk, mark)
                    
                    # if this is the first sample for this study/trait combo, add the study information first
                    if samp_count == 1:
                        json_study_results.update({
                            'studyID': printStudyID,
                            'citation': citation,
                            'reportedTrait': reportedTrait,
                            'trait': trait
                        })

                    # add the sample score and variant information
                    json_sample_results = {
                        'sample': samp,
                        'polygenicRiskScore': prs,
                        'protectiveAlleles': "|".join(protectiveVariants),
                        'riskAlleles': "|".join(riskVariants),
                        'variantsWithoutRiskAllele': "|".join(unmatchedAlleleVariants),
                        'variantsInHighLD': "|".join(clumpedVariants)
                    }
                    
                    json_samp_list.append(json_sample_results) # Add this sample's results to a list of sample results for this study/trait

                    # check if scores for all the samples have been calculated
                    # if so, write the object to the json file
                    if samp_count == samp_num:
                        json_study_results.update({'samples': json_samp_list})
                        formatJson(json_study_results, outputFile)
                        # set the objects to empty to save memory
                        json_study_results = {}
                        json_samp_list = []
                
                elif isCondensedFormat:
                    # add needed markings to study/score
                    prs, printStudyID = createMarks(oddsRatios, studyID, asterisk, mark)

                    # if this is the first sample, initiate the new line with the first four columns
                    if samp_count == 1:
                        newLine = [printStudyID, reportedTrait, trait, citation]
                    newLine.append(prs) # append this sample's score to the row
                    
                    # if we've calculated a score for each sample, write the line to the output file
                    if samp_count == samp_num:
                        formatTSV(False, newLine, [], outputFile)
                    
            else:
                #TODO have this report directly to the PRSKB server
                raise SystemExit("ERROR: A study ID was missing from the our metadata. Please report this to the PRSKB team along with the command you used to run the program. {}, {}".format(studyID, trait))

    return 


def formatJson(studyInfo, outputFile):
    json_output=[]
    json_output.append(studyInfo)
    # if this is the first object to be added, write it to the output file
    if not os.path.exists(outputFile):
        with FileLock(outputFile + ".lock"):
            with open(outputFile, 'w', newline='') as f:
                json.dump(json_output, f, indent=4)
    else:
        with FileLock(outputFile + ".lock"):
            # if there is already data in the output file, remove the closing ] and add a comma with the new json object and then close the file with a closing ]
            with open(outputFile, 'r+', newline = '') as f:
                f.seek(0,2)
                position = f.tell() -1
                f.seek(position)
                f.write( ",{}]".format(json.dumps(studyInfo, indent=4)))
    return


def createMarks(oddsRatios, studyID, asterisk, mark):
    prs = str(getPRSFromArray(oddsRatios))
    # Add an * to studies that have SNPs not present in the input file
    if asterisk:
        studyID = studyID + '*'
    # Add a mark to studies that have duplicate snps with varying pvalue annotations
    if mark is True:
        studyID = studyID + '†'
    return prs, studyID


# prints the study/trait combos that don't have matching snps to one in the input file
def printUnusedTraitStudyPairs(trait, study, outputFile, isFirst):
    fileBasename = os.path.basename(outputFile)
    fileDirname = os.path.dirname(outputFile)
    fileName, ext = os.path.splitext(fileBasename)
    fileBasename = fileName + "_studiesNotIncluded.txt"
    completeOutputFileName = os.path.join(fileDirname, fileBasename)

    # if the folder of the output file doesn't exist, create it
    if "/" in completeOutputFileName:
        os.makedirs(os.path.dirname(completeOutputFileName), exist_ok=True)

    # if this is the first trait/study to be added, write the header as well
    if isFirst:
        with FileLock(completeOutputFileName + ".lock"):
            with open(completeOutputFileName, 'w', encoding="utf-8") as openFile:
                openFile.write("Trait/Study combinations with no matching snps in the input file:")
    else:
        with FileLock(completeOutputFileName + ".lock"):
            with open(completeOutputFileName, 'a', encoding="utf-8") as openFile:
                openFile.write('\n')
                openFile.write(str(trait))
                openFile.write(', ')
                openFile.write(str(study))

    return 


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
        with FileLock(outputFile + ".lock"):
            with open(outputFile, 'w', newline='', encoding="utf-8") as f:
                output = csv.writer(f, delimiter='\t')
                output.writerow(header)
    else:
        with FileLock(outputFile + ".lock"):
            with open(outputFile, 'a', newline='', encoding="utf-8") as f:
                output = csv.writer(f, delimiter='\t')
                output.writerow(newLine)
    return

