import sys
import vcf
import zipfile
import tarfile
import gzip
from collections import defaultdict
from collections import namedtuple
import json
import math
 

def calculateScore(inputFile, pValue, outputType, tableObjList, clumpsObjList, refGen):
    tableObjList = json.loads(tableObjList)
    clumpsObjList = json.loads(clumpsObjList)

    # tells us if we were passed rsIDs or a vcf
    isRSids = True if inputFile.lower().endswith(".txt") else False

    identToStudies = getSNPsFromTableObj(tableObjList, refGen, isRSids)

    if isRSids:
        txtObj, totalVariants = parse_txt(inputFile, clumpsObjList, identToStudies)
        results = txtcalculations(tableObjList, txtObj,
                            totalVariants, pValue, refGen, outputType) #TODO this fuction still needs to be formatted for the new stuff
    else:
        vcfObj, totalVariants = parse_vcf(inputFile, clumpsObjList, identToStudies)
        results = vcfcalculations(tableObjList, vcfObj,
                            totalVariants, pValue, refGen, outputType) #TODO this fuction still needs to be formatted for the new stuff
    return(results)


def getSNPsFromTableObj(tableObjList, refGen, isRSids):
    identToStudies = defaultdict(dict)

    outFile = open("qqq.txt", "w")
    outFile.write(str(tableObjList))
    outFile2 = open('rrr.txt', 'w')
    for pos in tableObjList:
        outFile2.write(str(pos))
        outFile2.write('\n\n\n')
        outFile2.write(str(tableObjList[pos]))
        snp = tableObjList[pos]['snp']
        outFile2.write('\nsnp: ')
        outFile2.write(str(snp))
        studies = tableObjList[pos]["studies"]
        outFile2.write('\n\n\n')
        outFile2.write(str(studies))
        snp_info = tableObjList[pos]
        for studyID in snp_info['studies']:
            study_info = snp_info['studies'][studyID]
            outFile2.write('\n\n\n')
            outFile2.write(str(studyID))
            if isRSids:
                importantValues = {
                    "pValue": study_info['pValue'],
                    "riskAllele": study_info['riskAllele'],
                    "oddsRatio": study_info['oddsRatio'],
                }
                outFile2.write('\n\n\n')
                outFile2.write(str(importantValues))

                # TODO REDO THIS CODE
                if (snp in identToStudies.keys()):
                    # potentially need to keep an eye on this - could a study have multiple p-values/ OR for same location?
                    identToStudies[snp][studyID] = importantValues
                else:
                    identToStudies[snp][studyID] = importantValues
                    
            elif not isRSids and pos != 'NA':
                importantValues = {
                    "pValue": studyID['pValue'],
                    "riskAllele": studyID['riskAllele'],
                    "oddsRatio": studyID['oddsRatio'],
                    "snp": snp,
                    "pos": studyID['pos']
                }

                outFile2.write('\n\n\n')
                outFile2.write(str(importantValues))

                if (pos in identToStudies.keys()):
                    # potentially need to keep an eye on this - could a study have multiple p-values/ OR for same location?
                    identToStudies[pos][studyID] = importantValues
                else:
                    identToStudies[pos][studyID] = importantValues

    return identToStudies


def parse_txt(txtFile, clumpsObjList, identToStudies):
    totalLines = 0
    
    openFile = open(txtFile, 'r')
    Lines = openFile.readlines()

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps 
    clumpMap = createClumpsDict(clumpsObjList, True)

    # Create a set to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_set = set()

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        line = line.strip() #line should be in format of rsID:Genotype,Genotype
        snp, alleles = line.split(':')
        alleles = alleles.split(',')
        
        if snp in identToStudies:
            for studyID in identToStudies[snp].keys():
                # Check to see if the snp position from this line in the file exists in the clump table
                if snp in clumpMap:
                    # Grab the clump number associated with this snp 
                    clumpNum = clumpMap[snp]
                    pValue = identToStudies[snp][studyID]['pValue']
                    # Add the studyID to the counter list because we now know at least there is
                    # at least one viable snp for this study
                    counter_set.add(studyID)
                    totalLines += 1

                    # Check if the studyID has been used in the index snp map yet
                    if studyID in index_snp_map:
                        # Check whether the existing index snp or current snp have a lower pvalue for this study
                        # and switch out the data accordingly
                        if clumpNum in index_snp_map[studyID]:
                            index_snp = index_snp_map[studyID][clumpNum]
                            index_pvalue = identToStudies[index_snp][studyID]["pValue"]
                            if pValue < index_pvalue and alleles != "": # need to rethink this check, is this going to be an effefctive check? or should it be an empty list?
                                del index_snp_map[studyID][clumpNum]
                                index_snp_map[studyID][clumpNum] = snp
                                del sample_map[studyID][index_snp]
                                sample_map[studyID][snp] = alleles
                            # do we need this???
                            elif pValue > index_pvalue and alleles != "":
                                if snp in sample_map[studyID]:
                                    if sample_map[studyID][snp] == "":
                                        del index_snp_map[studyID][clumpNum]
                                        index_snp_map[studyID][clumpNum] = snp
                                        del sample_map[studyID][index_snp]
                                        sample_map[studyID][snp] = alleles
                        else:
                            # Since the clump number for this snp position and studyID
                            # doesn't already exist, add it to the index map and the sample map
                            index_snp_map[studyID][clumpNum] = snp
                            sample_map[studyID][snp] = alleles
                    else:
                        # Since the study wasn't already used in the index map, add it to both the index and sample map
                        index_snp_map[studyID][clumpNum] = snp
                        sample_map[studyID][snp] = alleles
            #TODO check this
            if studyID not in counter_set:
                sample_map[studyID][""] = ""

    final_map = dict(sample_map)
    return final_map, totalLines



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
    if genotype != "./.":
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
                if gt_nums[1] == 0:
                    alleles.append(REF)
                elif gt_nums[1] == 1:
                    alleles.append(ALT)
            elif count == 2:
                if gt_nums[0] == 0:
                    alleles.append(REF)
                elif gt_nums[1] == 1:
                    alleles.append(ALT)
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
                elif gt_nums[1] == '1':
                    alleles.append(ALT)
            elif count == 2:
                if gt_nums[0] == 0:
                    alleles.append(REF)
                elif gt_nums[1] == 1:
                    alleles.append(ALT)
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
                if gt_nums[1] == 0:
                    alleles.append(REF)
                elif gt_nums[1] == 1:
                    alleles.append(ALT)
            elif count == 2:
                if gt_nums[0] == 0:
                    alleles.append(REF)
                elif gt_nums[1] == 1:
                    alleles.append(ALT)
                alleles.append("")
            

    else:
        alleles = ""
    #    if gt is not None:
    #        if "|" in gt:
    #            alleles = gt.split('|')
    #        elif "/" in gt:
    #            alleles = gt.split('/')
    #        else:
    #            alleles = list(gt)
    #    else:
    #        alleles=""
    # Check if the study/name combo has been used in the index snp map yet

    return alleles


def parse_vcf(inputFile, clumpsObjList, identToStudies):
    totalLines = 0 

    vcf_reader = openFileForParsing(inputFile)
    
    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # format LD clumps, (isRSids is False)
    clumpMap = createClumpsDict(clumpsObjList, False)

    # Create a list to keep track of which study/samples have viable snps and which ones don't 
    counter_set = set()

    # Iterate through each line in the vcf file
    for record in vcf_reader:
        chromPos = str(record.CHROM) + ":" + str(record.POS)
        ALT = record.ALT[0]
        REF = record.REF[0] #TODO: check if this is right or if it should just be .REF
        
        # if the position is found in our database 
        if chromPos in identToStudies:
            # Loop through each study containing the position
            for study in identToStudies[chromPos].keys():

                # Loop through each sample of the vcf file
                for call in record.samples:  
                    gt = call.gt_bases    
                    genotype = record.genotype(name)['GT']
                    # Create a tuple with the study and sample name
                    study_sample = (study, call.sample)
                    # Check to see if the snp position from this line in the vcf exists in the clump table for this study
                    
                    if chromPos in clumpMap:
                        # Grab the clump number associated with this study and snp position
                        clumpNum = clumpMap[chromPos] 

                        # grab pValue from PRSBK database data
                        pValue = identToStudies[chromPos][study]['pValue']
                        # Add the study/sample tuple to the counter list because we now know at least there is
                        # at least one viable snp for this combination 
                        counter_set.add(study_sample)
                        totalLines += 1
                        
                        # Check whether the genotype for this sample and snp exists
                        alleles = formatAndReturnGenotype(genotype, gt, REF, ALT)

                        if study_sample in index_snp_map:
                            # if the clump number for this snp position and study/name is alraedy in the index map, move forward
                            if clumpNum in index_snp_map[study_sample]:
                                # Check whether the existing index snp or current snp have a lower pvalue for this study
                                # and switch out the data accordingly
                                # if the current snp position has no alleles, do not add it to the maps
                                # if the existing index snp has no alleles, put in the current snp even if the pvalue is higher
                                index_snp = index_snp_map[study_sample][clumpNum]
                                index_pvalue = identToStudies[index_snp][study]['pValue'] 
                                if pValue < index_pvalue and alleles != "":
                                    del index_snp_map[study_sample][clumpNum]
                                    index_snp_map[study_sample][clumpNum] = chromPos
                                    del sample_map[study_sample][index_snp]
                                    sample_map[study_sample][chromPos] = alleles
                                elif pValue > index_pvalue and alleles != "":
                                    if chromPos in sample_map[study_sample]:
                                        if sample_map[study_sample][chromPos] == "":
                                            del index_snp_map[study_sample][clumpNum]
                                            index_snp_map[study_sample][clumpNum] = chromPos
                                            del sample_map[study_sample][index_snp]
                                            sample_map[study_sample][chromPos] = alleles
                            else:
                                # Since the clump number for this snp position and study/name
                                # doesn't already exist, add it to the index map and the sample map
                                index_snp_map[study_sample][clumpNum] = chromPos
                                sample_map[study_sample][chromPos] = alleles
                        else:
                            # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                            index_snp_map[study_sample][clumpNum] = chromPos
                            sample_map[study_sample][chromPos] = alleles

        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        # TODO: might need a better way to handle this
        for name in vcf_reader.samples:
            for study in identToStudies[chromPos].keys():
                study_sample = (study, name)
                if study_sample not in counter_set:
                    sample_map[study_sample][""] = ""
    
    final_map = dict(sample_map)
    return final_map, totalLines


def txtcalculations(tableObjList, txtObj, totalVariants, pValue, refGen, outputType):
    resultJsons = []
    resultJsons.append({
        "pValueCutoff": pValue,
        "totalVariants": totalVariants
    })
    # Loop through every disease/study in the txt nested dictionary
    for disease_study in txtObj:
        disease, studyID = disease_study
        diseases = []  
        studies = []
        diseaseResults = {}
        oddRatios = []
        rsids = []
        studyResults = {}
        
        # Loop through each snp associated with this disease/study
        for snp in txtObj[disease_study]:
            # Also iterate through each of the alleles
            for allele in txtObj[disease_study][snp]:
                # Then compare to the gwa study
                if allele != "":
                    for row in tableObjList[disease][studyID]['associations']:
                        rowSnp = row['snp']
                        # Compare the individual's snp and allele to the study row's snp and risk allele
                        if snp == rowSnp and allele == row['riskAllele']:
                            oddRatios.append(row['oddsRatio'])
                            # chromPosList.append(row['pos'])
                            rsids.append(row['snp'])
        studyResults.update({
            "study": studyID,
            "citation": tableObjList[disease][studyID]['citation'],
            "oddsRatio": getCombinedORFromArray(oddRatios),
            "percentile": "",
            "numSNPsIncluded": len(oddRatios),
            # "chromPositionsIncluded": chromPosList,
            "snpsIncluded": rsids
        })
        studies.append(studyResults)

        diseaseResults.update({
            "disease": disease,
            "studyResults": studies
        })
        diseases.append(diseaseResults)

        resultJsons.append({
            "individualName": "fromTextFile",
            "diseaseResults": diseases
        })
    if outputType.lower() == "csv":
        output = formatCSV(resultJsons)
        return(output)
    else:
        # TODO Test this!
        output = json.dumps(resultJsons)
        return(output)


def vcfcalculations(tableObjList, vcfObj, totalVariants, pValue, refGen, outputType):
    resultJsons = []
    resultJsons.append({
        "pValueCutoff": pValue,
        "totalVariants": totalVariants
    })
    # For every sample in the vcf nested dictionary
    for disease_study_samp in vcfObj:
        disease, studyID, samp = disease_study_samp
        diseases = []  
        studies = []
        diseaseResults = {}
        oddRatios = []
        rsids = []
        chromPosList = []
        studyResults = {}
        
        # Loop through each snp associated with this disease/study/sample
        for chromPos in vcfObj[disease_study_samp]:
             # Also iterate through each of the alleles for the snp
            for allele in vcfObj[disease_study_samp][chromPos]:
                allele = str(allele)
                # Then compare to the gwa study
                for row in tableObjList[disease][studyID]['associations']:
                    if row['pos'] != 'NA':
                        databaseChromPos = row['pos']
                    else:
                        databaseChromPos = "NA"
                    if allele != "": #TODO check this 
                        # Compare the individual's snp and allele to the study row's snp and risk allele
                        # If they match, use that snp's odds ratio to the calculation
                        if chromPos == databaseChromPos and allele == row['riskAllele']:
                            oddRatios.append(row['oddsRatio'])
                            chromPosList.append(row['pos'])
                            if row['snp'] is not None:
                                rsids.append(row['snp'])
                    # else:
                    #     if chromPos == hg38_pos:
                    #         oddRatios.append(row['oddsRatio'])
                    #         chromPosList.append(row['pos'])
                    #         if row['snp'] is not None:
                    #             rsids.append(row['snp'])
        studyResults.update({
            "study": studyID,
            "citation": tableObjList[disease][studyID]['citation'],
            "oddsRatio": getCombinedORFromArray(oddRatios),
            "percentile": "",
            "numSNPsIncluded": len(oddRatios),
            "chromPositionsIncluded": chromPosList,
            "snpsIncluded": rsids
        })
        studies.append(studyResults)

        diseaseResults.update({
            "disease": disease,
            "studyResults": studies
        })
        diseases.append(diseaseResults)

        resultJsons.append({
            "individualName": samp,
            "diseaseResults": diseases
        })
    if outputType.lower() == "csv":
        output = formatCSV(resultJsons)
        return(output)
    else:
        # TODO Test this!
        output = json.dumps(resultJsons)
        return(output)

def getCombinedORFromArray(oddRatios):
    combinedOR = 0
    for oratio in oddRatios:
        oratio = float(oratio)
        combinedOR += math.log(oratio)
    combinedOR = math.exp(combinedOR)
    return(combinedOR)

def createClumpsDict(clumpsObj, isRSids):
    # Access the snp clumps
    clumpMap = defaultdict(dict)

    # Loop through each snpObj in the clump object and grab the position and clump number
    # For population clumping
    for snpObj in clumpsObj:
        if (isRSids):
            ident = snpObj['snp']
        else:
            ident = snpObj['pos']
        clumpNum = snpObj['clumpNumber']
        clumpMap[ident] = clumpNum

    return clumpMap


def formatCSV(results):
    header = "Individual Name, Disease, Study, Odds Ratio, Percentile, # SNPs in OR, Chrom Positions in OR, SNPs in OR"
    finalText = header
    for samp in results[1:]:
        name = samp['individualName']
        diseaseResults = samp['diseaseResults']
        for disease in diseaseResults:
            diseaseName = disease['disease']
            studyResults = disease['studyResults']
            for studyEntry in studyResults:
                study = studyEntry['study']
                oddsRatio = studyEntry['oddsRatio']
                percentile = studyEntry['percentile']
                numSNPsinOR = studyEntry['numSNPsIncluded']
                if (name != "fromTextFile"):
                    chromPosinOR = ";".join(studyEntry['chromPositionsIncluded'])
                snpsinOR = ";".join(studyEntry['snpsIncluded'])
                if numSNPsinOR > 0:
                    line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + str(oddsRatio) + "," + \
                        str(percentile) + "," + str(numSNPsinOR)
                    line += "," + str(chromPosinOR) + "," + str(snpsinOR) if (name != "fromTextFile") else "," + str(snpsinOR)
                    # "," + str(chromPosinOR) + "," + str(snpsinOR)
                else:
                    line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + "NO VARIANTS FROM THIS STUDY WERE PRESENT IN THIS INDIVIDUAL"
                finalText += "\n" + line
    finalText += '\n'
    return finalText
