import json
import math
import csv
import os
from filelock import FileLock

def calculateScore(snpSet, parsedObj, tableObjDict, mafDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, studyID, pValueAnno, betaAnnotation, valueType, snpCount, isRSids, sampleOrder):
    # check if the input file is a txt or vcf file and then run the calculations on that file
    if isRSids:
        txtcalculations(snpSet, parsedObj, tableObjDict, mafDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFilePath, unusedTraitStudy, trait, studyID, pValueAnno, betaAnnotation, valueType, snpCount)
    else:
        vcfcalculations(snpSet, parsedObj, tableObjDict, mafDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, unusedTraitStudy, trait, studyID, pValueAnno, betaAnnotation, valueType, sampleOrder, snpCount)
    return


def txtcalculations(snpSet, txtObj, tableObjDict, mafDict, isJson, isCondensedFormat, omitUnusedStudiesFile, unmatchedAlleleVariants, clumpedVariants, outputFile, unusedTraitStudy, trait, studyID, pValueAnno, betaAnnotation, valueType, snpCount):
    pValBetaAnnoValType = "|".join((pValueAnno, betaAnnotation, valueType))
    # if this trait/study had no snps in the input file, print the trait/study to the output list
    if unusedTraitStudy and not omitUnusedStudiesFile:
        printStudyID = studyID
        printUnusedTraitStudyPairs(trait, printStudyID, pValueAnno, betaAnnotation, valueType, outputFile, False)

    else:
        if studyID in tableObjDict['studyIDsToMetaData'].keys():
            # study info
            citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
            reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
            betas = [] # holds the oddsRatios used for calculation
            betaUnits = [] # holds the units for the betas
            # Output Sets
            protectiveVariants = set()
            riskVariants = set()

            mark = False

            #Add a mark to the studies that have SNPs that aren't present in the input file
            asterisk = True if len(snpSet) != snpCount else False

            nonMissingSnps = 0
            for snp in txtObj:
                # Also iterate through each of the alleles
                if snp in snpSet:
                    nonMissingSnps += 1
                    riskAllele = tableObjDict['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType]['riskAllele']
                    units = tableObjDict['associations'][snp]["traits"][trait][studyID][pValBetaAnnoValType]['betaUnit']
                    # if the values are betas, then grab the value, if odds ratios, then take the natural log of the odds ratio
                    snpBeta = tableObjDict['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType]['betaValue'] if valueType == "beta" else math.log(tableObjDict['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType]['oddsRatio'])
                    for allele in txtObj[snp]:
                        # Then compare to the gwa study
                        if allele != "":
                            if allele == riskAllele:
                                betas.append(snpBeta)
                                betaUnits.append(units)
                                if snpBeta < 0:
                                    protectiveVariants.add(snp)
                                elif snpBeta > 0:
                                    riskVariants.add(snp)
                            elif allele == "." :
                                mafVal = mafDict[snp]['alleles'][riskAllele] if snp in mafDict else 0
                                betas.append(snpBeta*mafVal)
                                betaUnits.append(units)
                                if snpBeta < 0:
                                    protectiveVariants.add(snp)
                                elif snpBeta > 0:
                                    riskVariants.add(snp)
                            else:
                                unmatchedAlleleVariants.add(snp)

            units = betaUnits.pop() if len(betaUnits) == 1 else "" #TODO might need to come up with a better way

            # unless the user indicates they don't want the extra output file..
            # if the sample did not have any matching snps with the gwa study, write the study out to the unused studies file
            if not omitUnusedStudiesFile and len(betas) == 0 and len(protectiveVariants) == 0 and len(riskVariants) == 0 and len(unmatchedAlleleVariants) == 0 and len(clumpedVariants) == 0:
                printStudyID = studyID
                printUnusedTraitStudyPairs(trait, printStudyID, pValueAnno, betaAnnotation, valueType, outputFile, False)

            elif not isCondensedFormat and not isJson:
                # add needed markings to scores/studies
                prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType)
                # Grab variant sets
                protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                # new line to add to tsv file
                newLine = [printStudyID, reportedTrait, trait, citation, "|".join([pValueAnno, betaAnnotation]), valueType, units, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                # add new ine to tsv file
                formatTSV(False, newLine, [], outputFile)
                
            elif isJson:
                # Add needed markings to scores/studies
                prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType)

                json_study_results = {
                    'studyID': printStudyID,
                    'reportedTrait': reportedTrait,
                    'trait': trait,
                    'citation': citation,
                    "pValueAnnotation|BetaAnnotation": "|".join([pValueAnno, betaAnnotation]),
                    'scoreType': valueType,
                    'units (if applicable)': units,
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
                prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType)
                newLine = [printStudyID, reportedTrait, trait, citation, "|".join([pValueAnno, betaAnnotation]), valueType, units, prs]
                # write new line to tsv file
                formatTSV(False, newLine, [], outputFile)
        else:
            raise SystemExit("ERROR: A study ID was missing from our metadata. Please report this to the PRSKB team along with the command you used to run the program.", studyID, trait)

    return


def vcfcalculations(snpSet, vcfObj, tableObjDict, mafDict, isJson, isCondensedFormat, omitUnusedStudiesFile, neutral_snps_map, clumped_snps_map, outputFile, samp_num, unusedTraitStudy, trait, studyID, pValueAnno, betaAnnotation, valueType, sampleOrder, snpCount):
    header = []
    pValBetaAnnoValType = "|".join((pValueAnno, betaAnnotation, valueType))
    # if the trait/study has no snps in the input file, write out the trait/study to the output list of unused traits/studies
    if unusedTraitStudy and not omitUnusedStudiesFile:
        printStudyID = studyID
        # this boolean variable will ensure that subsequent unused traits/studies are appended, not written, to the output file
        printUnusedTraitStudyPairs(trait, printStudyID, pValueAnno, betaAnnotation, valueType, outputFile, False)

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
                betas = [] # For storing the betas used in calculation
                betaUnits = set() # holds the units for the betas
                # study info
                citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
                reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
                # Output Sets
                unmatchedAlleleVariants = neutral_snps_map[samp] if samp in neutral_snps_map.keys() else set()
                clumpedVariants = clumped_snps_map[samp] if samp in clumped_snps_map.keys() else set()
                protectiveVariants = set()
                riskVariants = set()
                # some studies have duplicate snps with varying pvalue annotations. we keep track of that here.
                # mark = True if 'traitsWithExcludedSnps' in tableObjDict['studyIDsToMetaData'][studyID].keys() and trait in tableObjDict['studyIDsToMetaData'][studyID]['traitsWithExcludedSnps'] else False
                mark = False
                # Create a mark for the studies that have SNPs that aren't present in the input file
                asterisk = True if len(snpSet) != snpCount else False
                # Loop through each snp associated with this disease/study/sample
                if samp in vcfObj:
                    nonMissingSnps = 0
                    for rsID in vcfObj[samp]:
                        # check if the snp is in this trait/study
                        if rsID in snpSet:
                            nonMissingSnps += 1
                            riskAllele = tableObjDict['associations'][rsID]['traits'][trait][studyID][pValBetaAnnoValType]['riskAllele']
                            units = tableObjDict['associations'][rsID]["traits"][trait][studyID][pValBetaAnnoValType]['betaUnit']
                            alleles = vcfObj[samp][rsID]
                            if alleles != "" and alleles is not None:
                                snpBeta = tableObjDict['associations'][rsID]['traits'][trait][studyID][pValBetaAnnoValType]['betaValue'] if valueType == "beta" else math.log(tableObjDict['associations'][rsID]['traits'][trait][studyID][pValBetaAnnoValType]['oddsRatio'])
                                for allele in alleles:
                                    allele = str(allele)
                                    if allele != "":
                                        betaUnits.add(units)
                                        # check if the risk allele matches one of the sample's alleles for this SNP
                                        if allele == riskAllele:
                                            betas.append(snpBeta) # add the odds ratio to the list of odds ratios used to calculate the score
                                            if snpBeta < 0:
                                                protectiveVariants.add(rsID)
                                            elif snpBeta > 0:
                                                riskVariants.add(rsID)
                                        elif allele == ".":
                                            mafVal = mafDict[rsID]['alleles'][riskAllele] if rsID in mafDict else 0
                                            betas.append(snpBeta*mafVal)
                                            if snpBeta < 0:
                                                protectiveVariants.add(rsID)
                                            elif snpBeta > 0:
                                                riskVariants.add(rsID)
                                        else:
                                            unmatchedAlleleVariants.add(rsID)

                studyUnits = betaUnits.pop() if len(betaUnits) == 1 else "" #TODO might need to come up with a better way!!!!!!!!!!!!!!!!!!!!!

                if not omitUnusedStudiesFile and len(betas) == 0 and len(protectiveVariants) == 0 and len(riskVariants) == 0 and len(unmatchedAlleleVariants) == 0 and len(clumpedVariants) == 0:
                    printStudyID = studyID
                    # check if the study/trait has already been printed to the unusedtraitstudy file. if it hasn't, print it to the file
                    if (trait, printStudyID) not in unusedTraitStudySet:
                        # this boolean variable will ensure that subsequent unused traits/studies are appended, not written, to the output file
                        printUnusedTraitStudyPairs(trait, printStudyID, pValueAnno, betaAnnotation, valueType, outputFile, False)
                        unusedTraitStudySet.add((trait, printStudyID))

                # if the output format is verbose
                if not isCondensedFormat and not isJson:
                    # add necessary marks to study/score
                    prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType)
                    #grab variant sets
                    protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                    # add new line to tsv file
                    newLine = [samp, printStudyID, reportedTrait, trait, citation, "|".join([pValueAnno, betaAnnotation]), valueType, studyUnits, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                    formatTSV(False, newLine, [], outputFile)

                elif isJson:
                    # Add needed markings to score and study
                    prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType)
                    
                    # if this is the first sample for this study/trait combo, add the study information first
                    if samp_count == 1:
                        json_study_results.update({
                            'studyID': printStudyID,
                            'reportedTrait': reportedTrait,
                            'trait': trait,
                            'citation': citation,
                            'pValueAnnotation|BetaAnnotation': "|".join([pValueAnno, betaAnnotation]),
                            'scoreType': valueType,
                            'units (if applicable)': studyUnits
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
                    prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType)

                    # if this is the first sample, initiate the new line with the first four columns
                    if samp_count == 1:
                        newLine = [printStudyID, reportedTrait, trait, citation, "|".join([pValueAnno, betaAnnotation]), valueType, studyUnits]
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


def createMarks(betas, nonMissingSnps, studyID, asterisk, mark, valueType):
    prs = str(getPRSFromArray(betas, nonMissingSnps, valueType))
    # Add an * to studies that have SNPs not present in the input file
    if asterisk:
        studyID = studyID + '*'
    # Add a mark to studies that have duplicate snps with varying pvalue annotations
    if mark is True:
        studyID = studyID + '†'
    return prs, studyID


# prints the study/trait combos that don't have matching snps to one in the input file
def printUnusedTraitStudyPairs(trait, study, pValueAnno, betaAnnotation, valueType, outputFile, isFirst):
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
                openFile.write("Trait/Study/P-Value Annotation|Beta Annotation/Value Type combinations with no matching snps in the input file:")
    else:
        with FileLock(completeOutputFileName + ".lock"):
            with open(completeOutputFileName, 'a', encoding="utf-8") as openFile:
                openFile.write('\n')
                openFile.write(str(trait))
                openFile.write(', ')
                openFile.write(str(study))
                openFile.write(', ')
                openFile.write(str("|".join([pValueAnno, betaAnnotation])))
                openFile.write(', ')
                openFile.write(valueType)

    return 


def getPRSFromArray(betas, nonMissingSnps, valueType):
# calculate the PRS from the list of betas
    ploidy = 2
    combinedBetas = 0
    if not betas:
        combinedBetas = "NF"
    else:
        for beta in betas:
            beta = float(beta)
            combinedBetas += beta
        if combinedBetas == 0:
            combinedBetas = 0.001

        combinedBetas = combinedBetas / ( ploidy * nonMissingSnps )

        if valueType == 'oddsRatios':
            combinedBetas = math.exp(combinedBetas)

        combinedBetas = round(combinedBetas, 3)

    return(str(combinedBetas))


def formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants):
# Format the sets of variants for the output file
    protectiveVariants = "." if str(protectiveVariants) == "set()" else "|".join(protectiveVariants)
    riskVariants = "." if str(riskVariants) == "set()" else "|".join(riskVariants)
    unmatchedAlleleVariants = "." if str(unmatchedAlleleVariants) == "set()" else "|".join(unmatchedAlleleVariants)
    clumpedVariants = "." if str(clumpedVariants) == "set()" else "|".join(clumpedVariants)

    return protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants


def formatTSV(isFirst, newLine, header, outputFile):
    # if the folder of the output file doesn't exist, create it
    if "/" in outputFile:
        os.makedirs(os.path.dirname(outputFile), exist_ok=True)

    # check if this is the first line
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

