import json
import math
import csv
import os
from filelock import FileLock

def calculateScore(snpSet, parsedObj, tableObjDict, mafDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, trait, studyID, pValueAnno, betaAnnotation, valueType, isRSids, sampleOrder):
    # check if the input file is a txt or vcf file and then run the calculations on that file
    if isRSids:
        txtcalculations(snpSet, parsedObj, tableObjDict, mafDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, trait, studyID, pValueAnno, betaAnnotation, valueType)
    else:
        vcfcalculations(snpSet, parsedObj, tableObjDict, mafDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFilePath, sample_num, trait, studyID, pValueAnno, betaAnnotation, valueType, sampleOrder)
    return


def txtcalculations(snpSet, txtObj, tableObjDict, mafDict, isJson, isCondensedFormat, unmatchedAlleleVariants, clumpedVariants, outputFile, trait, studyID, pValueAnno, betaAnnotation, valueType):
    # this variable is used as a key in various dictionaries. Due to the nature of the studies in our database, 
    # we separate calculations by trait, studyID, pValueAnnotation, betaAnnotation, and valueType. 
    # pValueAnnotation - comes from the GWAS catalog, gives annotation to the pvalue
    # betaAnnotation - comes from the GWAS catalog, gives annotation to the beta value
    # valueType - denotes if the values are originally beta values or odds ratios
    pValBetaAnnoValType = "|".join((pValueAnno, betaAnnotation, valueType))

    if studyID in tableObjDict['studyIDsToMetaData'].keys():
        # study info
        citation = tableObjDict['studyIDsToMetaData'][studyID]['citation']
        reportedTrait = tableObjDict['studyIDsToMetaData'][studyID]['reportedTrait']
        betas = [] # holds the oddsRatios used for calculation
        betaUnits = set() # holds the units for the betas
        # Output Sets
        protectiveVariants = set()
        riskVariants = set()

        mark = False

        nonMissingSnps = 0
        for snp in txtObj:
            if snp in snpSet:
                nonMissingSnps += 1
                tmpMafDeciderObj = {}
                for riskAllele in tableObjDict['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType]:
                    units = tableObjDict['associations'][snp]["traits"][trait][studyID][pValBetaAnnoValType][riskAllele]['betaUnit']
                    # if the values are betas, then grab the value, if odds ratios, then take the natural log of the odds ratio
                    snpBeta = tableObjDict['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType][riskAllele]['betaValue'] if valueType == "beta" else math.log(tableObjDict['associations'][snp]['traits'][trait][studyID][pValBetaAnnoValType][riskAllele]['oddsRatio'])
                    # Also iterate through each of the alleles
                    for allele in txtObj[snp]:
                        # Then compare to the gwa study
                        if allele != "":
                            if allele == riskAllele:
                                betas.append(snpBeta)
                                betaUnits.add(units)
                                if snpBeta < 0:
                                    protectiveVariants.add(snp)
                                elif snpBeta > 0:
                                    riskVariants.add(snp)
                            elif allele == "." :
                                mafVal = mafDict[snp]['alleles'][riskAllele] if snp in mafDict and riskAllele in mafDict[snp]["alleles"] else 0
                                mafKey = "{}|{}".format(mafVal, riskAllele)
                                # We can't put this into the betas yet, because if there are multiple reported risk alleles (uncommon, but possible) we need to be able to chose the allele with the most common allele frequency
                                if mafKey not in tmpMafDeciderObj:
                                    tmpMafDeciderObj[mafKey] = {
                                        "snpBeta": snpBeta,
                                        "numAlleles": 1
                                    }
                                else:
                                    tmpMafDeciderObj[mafKey]["numAlleles"] += 1
                            else:
                                unmatchedAlleleVariants.add(snp)
                
                # here is where we find the allele with the greatest allele frequency, which indicates that the allele is more prevelant in the population and should thus be the one we choose to use (note, most of the time, there is only a single allele being considered here)
                tmpMAFmostCommonKey = ""
                tmpMAFmostCommonVal = 0
                tmpMAFmostCommonBeta = 0
                tmpMAFmostCommonUnits = ""
                for key in tmpMafDeciderObj:
                    maf, mafAllele = key.split("|")
                    if maf >= tmpMAFmostCommonVal:
                        tmpMAFmostCommonVal = maf
                        tmpMAFmostCommonKey = key
                        tmpMAFmostCommonBeta = tmpMafDeciderObj[key]["snpBeta"]
                betas.append(tmpMAFmostCommonBeta*tmpMAFmostCommonVal*tmpMafDeciderObj[tmpMAFmostCommonKey]["numAlleles"])
                betaUnits.add(tmpMAFmostCommonUnits)
                if tmpMAFmostCommonBeta < 0:
                    protectiveVariants.add(snp)
                elif tmpMAFmostCommonBeta > 0:
                    riskVariants.add(snp)

        if len(betaUnits) > 1:
            lowercaseB = [x.lower() for x in betaUnits]
            if len(set(lowercaseB)) == 1:
                studyUnits = lowercaseB.pop()
            else:
                print("ERROR: The following had too many betaUnits: {} {} {}".format(trait, studyID, pValBetaAnnoValType))
                print("Output file will list 'Error - too many units' as the betaUnits")
                studyUnits = 'Error - too many units'
        elif len(betaUnits) == 1:
            studyUnits = betaUnits.pop()
        else:
            studyUnits = "NA"

        # add needed markings to scores/studies
        prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, mark, valueType)
        if not isCondensedFormat and not isJson:
            
            # Grab variant sets
            protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
            # new line to add to tsv file
            newLine = [printStudyID, reportedTrait, trait, citation, pValueAnno, betaAnnotation, valueType, studyUnits, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
            # add new line to tsv file
            formatTSV(False, newLine, [], outputFile)
            
        elif isJson:

            json_study_results = {
                'studyID': printStudyID,
                'reportedTrait': reportedTrait,
                'trait': trait,
                'citation': citation,
                "pValueAnnotation": pValueAnno,
                'betaAnnotation': betaAnnotation,
                'scoreType': valueType,
                'units (if applicable)': studyUnits,
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
            newLine = [printStudyID, reportedTrait, trait, citation, pValueAnno, betaAnnotation, valueType, studyUnits, prs]
            # write new line to tsv file
            formatTSV(False, newLine, [], outputFile)
    else:
        raise SystemExit("ERROR: A study ID was missing from our metadata. Please report this to the PRSKB team along with the command you used to run the program.", studyID, trait)

    return


def vcfcalculations(snpSet, vcfObj, tableObjDict, mafDict, isJson, isCondensedFormat, neutral_snps_map, clumped_snps_map, outputFile, samp_num, trait, studyID, pValueAnno, betaAnnotation, valueType, sampleOrder):
    # this variable is used as a key in various dictionaries. Due to the nature of the studies in our database, 
    # we separate calculations by trait, studyID, pValueAnnotation, betaAnnotation, and valueType. 
    pValBetaAnnoValType = "|".join((pValueAnno, betaAnnotation, valueType))

    # keep track of the samples that have had their scores calculated so we know when to write out the condensed format line and json output
    samp_count = 0
    # json output objects
    json_study_results = {}
    json_samp_list = []
    nonMissingSnps = 0

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
            mark = False
            # Loop through each snp associated with this disease/study/sample
            if samp in vcfObj:
                nonMissingSnps = 0
                for rsID in vcfObj[samp]:
                    # check if the snp is in this trait/study
                    if rsID in snpSet:
                        nonMissingSnps += 1
                        tmpMafDeciderObj = {}
                        for riskAllele in tableObjDict['associations'][rsID]['traits'][trait][studyID][pValBetaAnnoValType]:
                            units = tableObjDict['associations'][rsID]["traits"][trait][studyID][pValBetaAnnoValType][riskAllele]['betaUnit']
                            alleles = vcfObj[samp][rsID]
                            if alleles != "" and alleles is not None:
                                snpBeta = tableObjDict['associations'][rsID]['traits'][trait][studyID][pValBetaAnnoValType][riskAllele]['betaValue'] if valueType == "beta" else math.log(tableObjDict['associations'][rsID]['traits'][trait][studyID][pValBetaAnnoValType][riskAllele]['oddsRatio'])
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
                                            mafVal = mafDict[rsID]['alleles'][riskAllele] if rsID in mafDict and riskAllele in mafDict[rsID]["alleles"] else 0
                                            mafKey = "{}|{}".format(mafVal, riskAllele)
                                            # We can't put this into the betas yet, because if there are multiple reported risk alleles (uncommon, but possible) we need to be able to chose the allele with the most common allele frequency
                                            if mafKey not in tmpMafDeciderObj:
                                                tmpMafDeciderObj[mafKey] = {
                                                    "snpBeta": snpBeta,
                                                    "numAlleles": 1
                                                }
                                            else:
                                                tmpMafDeciderObj[mafKey]["numAlleles"] += 1
                                        else:
                                            unmatchedAlleleVariants.add(rsID)
                        # here is where we find the allele with the greatest allele frequency, which indicates that the allele is more prevelant in the population and should thus be the one we choose to use (note, most of the time, there is only a single allele being considered here)
                        tmpMAFmostCommonKey = ""
                        tmpMAFmostCommonVal = 0
                        tmpMAFmostCommonBeta = 0
                        tmpMAFmostCommonUnits = ""
                        for key in tmpMafDeciderObj:
                            maf, mafAllele = key.split("|")
                            if maf >= tmpMAFmostCommonVal:
                                tmpMAFmostCommonVal = maf
                                tmpMAFmostCommonKey = key
                                tmpMAFmostCommonBeta = tmpMafDeciderObj[key]["snpBeta"]
                        betas.append(tmpMAFmostCommonBeta*tmpMAFmostCommonVal*tmpMafDeciderObj[tmpMAFmostCommonKey]["numAlleles"])
                        betaUnits.add(tmpMAFmostCommonUnits)
                        if tmpMAFmostCommonBeta < 0:
                            protectiveVariants.add(rsID)
                        elif tmpMAFmostCommonBeta > 0:
                            riskVariants.add(rsID)

            if len(betaUnits) > 1:
                lowercaseB = [x.lower() for x in betaUnits]
                if len(set(lowercaseB)) == 1:
                    studyUnits = lowercaseB.pop()
                else:
                    print("ERROR: The following had too many betaUnits: {} {} {} {}".format(samp, trait, studyID, pValBetaAnnoValType))
                    print("Output file will list 'Error - too many units' as the betaUnits")
                    studyUnits = 'Error - too many units'
            elif len(betaUnits) == 1:
                studyUnits = betaUnits.pop()
            else:
                studyUnits = "NA"

            # add necessary marks to study/score
            prs, printStudyID = createMarks(betas, nonMissingSnps, studyID, mark, valueType)
            # if the output format is verbose
            if not isCondensedFormat and not isJson:
                #grab variant sets
                protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants = formatSets(protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants)
                # add new line to tsv file
                newLine = [samp, printStudyID, reportedTrait, trait, citation, pValueAnno, betaAnnotation, valueType, studyUnits, prs, protectiveVariants, riskVariants, unmatchedAlleleVariants, clumpedVariants]
                formatTSV(False, newLine, [], outputFile)

            elif isJson:
                # if this is the first sample for this study/trait combo, add the study information first
                if samp_count == 1:
                    json_study_results.update({
                        'studyID': printStudyID,
                        'reportedTrait': reportedTrait,
                        'trait': trait,
                        'citation': citation,
                        'pValueAnnotation': pValueAnno,
                        'betaAnnotation' : betaAnnotation,
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
                # if this is the first sample, initiate the new line with the first four columns
                if samp_count == 1:
                    newLine = [printStudyID, reportedTrait, trait, citation, pValueAnno, betaAnnotation, valueType, studyUnits]
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


def createMarks(betas, nonMissingSnps, studyID, mark, valueType):
    prs = str(getPRSFromArray(betas, nonMissingSnps, valueType))
    # Add a mark to studies that have duplicate snps with varying pvalue annotations
    if mark is True:
        studyID = studyID + '†'
    return prs, studyID


def getPRSFromArray(betas, nonMissingSnps, valueType):
# calculate the PRS from the list of betas
    ploidy = 2
    combinedBetas = 0
    # if there are no values in the betas array, set combinedBetas to 'NF'
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

