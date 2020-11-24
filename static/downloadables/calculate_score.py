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
 

def calculateScore(inputFile, pValue, outputType, tableObjList, clumpsObjList, refGen, isCondensedFormat, outputFile):
    tableObjList = json.loads(tableObjList)
    clumpsObjList = json.loads(clumpsObjList)

    # tells us if we were passed rsIDs or a vcf
    isRSids = True if inputFile.lower().endswith(".txt") else False

    identToStudies = getSNPsFromTableObj(tableObjList, refGen, isRSids)

    if isRSids:
        txtObj, totalVariants, neutral_snps = parse_txt(inputFile, clumpsObjList, identToStudies)
        results = txtcalculations(tableObjList, txtObj, isCondensedFormat, neutral_snps, outputFile)#TODO this fuction still needs to be formatted for the new stuff
    else:
        vcfObj, totalVariants, neutral_snps = parse_vcf(inputFile, clumpsObjList, identToStudies)
        results = vcfcalculations(tableObjList, vcfObj,isCondensedFormat, neutral_snps, outputFile) #TODO this fuction still needs to be formatted for the new stuff
    return(results)


def getSNPsFromTableObj(tableObjList, refGen, isRSids):
    identToStudies = defaultdict(dict)

    for pos in tableObjList:
        snp = tableObjList[pos]['snp']
        studies = tableObjList[pos]["studies"]
        snp_info = tableObjList[pos]
        for studyID in snp_info['studies']:
            study_info = snp_info['studies'][studyID]
            if isRSids:
                importantValues = {
                    "pValue": study_info['pValue'],
                    "riskAllele": study_info['riskAllele'],
                    "oddsRatio": study_info['oddsRatio'],
                }

                # TODO REDO THIS CODE
                if (snp in identToStudies.keys()):
                    # potentially need to keep an eye on this - could a study have multiple p-values/ OR for same location?
                    identToStudies[snp][studyID] = importantValues
                else:
                    identToStudies[snp][studyID] = importantValues
                    
            elif not isRSids and pos != 'NA':
                importantValues = {
                    "pValue": study_info['pValue'],
                    "riskAllele": study_info['riskAllele'],
                    "oddsRatio": study_info['oddsRatio'],
                    "snp": snp,
                    "pos": pos,
                }


                if (pos in identToStudies.keys()):
                    # potentially need to keep an eye on this - could a study have multiple p-values/ OR for same location?
                    identToStudies[pos][studyID] = importantValues
                else:
                    identToStudies[pos][studyID] = importantValues

    return identToStudies


def parse_txt(txtFile, clumpsObjList, identToStudies):
    totalLines = 0
    
    Lines = openFile.readlines()

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps 
    clumpMap = createClumpsDict(clumpsObjList, True)

    # Create a set to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_set = set()

    # Create a dictionary of studyIDs to neutral snps
    neutral_snps = {}

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        line = line.strip() #line should be in format of rsID:Genotype,Genotype
        snp, alleles = line.split(':')
        alleles = alleles.split(',')
        
        if alleles != []: #TODO: check if this should be an empty list or an empty string
            if snp in identToStudies:
                for studyID in identToStudies[snp].keys():
                    if studyID in neutral_snps:
                        neutral_snps_set = neutral_snps[studyID]
                    else:
                        neutral_snps_set = set()
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
                                if pValue < index_pvalue:
                                    del index_snp_map[studyID][clumpNum]
                                    index_snp_map[studyID][clumpNum] = snp
                                    del sample_map[studyID][index_snp]
                                    sample_map[studyID][snp] = alleles
                                    # The snps that aren't index snps will be considered neutral snps
                                    neutral_snps_set.add(index_snp)
                                else:
                                    neutral_snps_set.add(snp)
                            else:
                                # Since the clump number for this snp position and studyID
                                # doesn't already exist, add it to the index map and the sample map
                                index_snp_map[studyID][clumpNum] = snp
                                sample_map[studyID][snp] = alleles
                        else:
                            # Since the study wasn't already used in the index map, add it to both the index and sample map
                            index_snp_map[studyID][clumpNum] = snp
                            sample_map[studyID][snp] = alleles
                    # The snp wasn't in the clump map (meaning it wasn't i 1000 Genomes), so add it to the neutral snps set
                    else:
                        sample_map[studyID][snp] = alleles

                    neutral_snps[studyID] = neutral_snps_set
                #TODO check this
                # TODO I don't think this works...this will only look at the very last studyID
                if studyID not in counter_set:
                    sample_map[studyID][""] = ""

    
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
    neutral_snps = {}
    rsid_pos_map = {}

    # Iterate through each line in the vcf file
    for record in vcf_reader:
        chromPos = str(record.CHROM) + ":" + str(record.POS)

        ALT = record.ALT
        REF = record.REF #TODO: check if this is right or if it should just be .REF
        rsid = record.ID
        # if the position is found in our database 
        if chromPos in identToStudies:
            # Loop through each study containing the position
            for study in identToStudies[chromPos].keys():

                # Loop through each sample of the vcf file
                for call in record.samples:  
                    gt = call.gt_bases    
                    name = call.sample
                    genotype = record.genotype(name)['GT']
                    alleles = formatAndReturnGenotype(genotype, gt, REF, ALT)
                    neutral_snps_set = {}
                    # Create a tuple with the study and sample name
                    study_sample = (study, name)
                    counter_set.add(study_sample)
                    # Check to see if the snp position from this line in the vcf exists in the clump table for this study
                    if chromPos in clumpMap:
                        # Grab the clump number associated with this study and snp position
                        clumpNum = clumpMap[chromPos] 

                        # grab pValue from PRSBK database data
                        pValue = identToStudies[chromPos][study]['pValue']
                        # Add the study/sample tuple to the counter list because we now know at least there is
                        # at least one viable snp for this combination 
                        totalLines += 1
                        
                        if study_sample in index_snp_map:
                            # if the clump number for this snp position and study/name is alraedy in the index map, move forward
                            if clumpNum in index_snp_map[study_sample]:
                                # Check whether the existing index snp or current snp have a lower pvalue for this study
                                # and switch out the data accordingly
                                # if the current snp position has no alleles, do not add it to the maps
                                # if the existing index snp has no alleles, put in the current snp even if the pvalue is higher
                                index_snp = index_snp_map[study_sample][clumpNum]
                                index_pvalue = identToStudies[index_snp][study]['pValue'] 
                                if pValue < index_pvalue:
                                    del index_snp_map[study_sample][clumpNum]
                                    index_snp_map[study_sample][clumpNum] = chromPos
                                    del sample_map[study_sample][index_snp]
                                    sample_map[study_sample][chromPos] = alleles

                                    if rsid_pos_map[index_snp] is not None:
                                        neutral_snps_set.add(rsid_pos_map[index_snp])
                                    else:
                                        neutral_snps_set.add(index_snp)
                                #TODO: Do we even want to look at snps that don't have corresponding alleles?
                                # I changed it so that we skip over snps that have "" as their alleles.
                                elif pValue > index_pvalue and alleles != "":
                                    if sample_map[study_sample][index_snp] == "":
                                        del index_snp_map[study_sample][clumpNum]
                                        index_snp_map[study_sample][clumpNum] = chromPos
                                        del sample_map[study_sample][index_snp]
                                        sample_map[study_sample][chromPos] = alleles

                                        if rsid_pos_map[index_snp] is not None:
                                            neutral_snps_set.add(rsid_pos_map[index_snp])
                                        else:
                                            neutral_snps_set.add(index_snp)

                                    else:
                                        if rsid is not None and rsid != "":
                                            neutral_snps_set.add(rsid)
                                        else:
                                            neutral_snps_set.add(chromPos)
                                else:
                                    if rsid is not None and rsid != "":
                                        neutral_snps_set.add(rsid)
                                    else:
                                        neutral_snps_set.add(chromPos)

                            else:
                                # Since the clump number for this snp position and study/name
                                # doesn't already exist, add it to the index map and the sample map
                                index_snp_map[study_sample][clumpNum] = chromPos
                                sample_map[study_sample][chromPos] = alleles
                                rsid_pos_map[chromPos] = rsid
                        else:
                            # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                            index_snp_map[study_sample][clumpNum] = chromPos
                            sample_map[study_sample][chromPos] = alleles
                            rsid_pos_map[chromPos] = rsid
                    else:
                        sample_map[study_sample][chromPos] = alleles
                    neutral_snps[study_sample] = neutral_snps_set
        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        # TODO: might need a better way to handle this
        for name in vcf_reader.samples:
            for study in identToStudies[chromPos].keys():
                study_sample = (study, name)
                if study_sample not in counter_set:
                    sample_map[study_sample][""] = ""
                    
    
    final_map = dict(sample_map)
    return final_map, totalLines, neutral_snps


def txtcalculations(tableObjList, txtObj,isCondensed, neutral_snps):
    # Loop through every disease/study in the txt nested dictionary
    isFirst = True
    for studyID in txtObj:
        oddsRatios = []
        neutral_snps_set = neutral_snps[studyID]
        protectiveAlleles = set()
        riskAlleles = set()

        
        # Loop through each snp associated with this disease/study
        for snp in txtObj[study]:
            # Also iterate through each of the alleles
            for allele in txtObj[study][snp]:
                # Then compare to the gwa study
                if allele != "":
                    if snp in tableObjList:
                        if studyID in tableObjList[snp]:
                            # Compare the individual's snp and allele to the study row's snp and risk allele
                            citation = tableObjList[snp]['studies'][studyID]['citation']
                            reportedTrait = tableObjList[snp]['studies'][studyID]['reportedTrait']
                            traits = tableObjList[snp]['studies'][studyID]['traits']
                            riskAllele = tableObjList[snp]['studies'][studyID]['riskAllele']
                            oddsRatio = tableObjList[snp]['studies'][studyID]['riskAllele']

                            if allele == riskAllele:
                                oddsRatios.append(oddsRatio)
                                if oddsRatio < 1:
                                    protectiveAlleles.add(snp)
                                elif oddsRatio > 1:
                                    riskAlleles.add(snp)
                                else:
                                    neutral_snps_set.add(snp)
                            elif allele != row['riskAllele']:
                                neutral_snps_set.add(snp)

        if not isCondensedFormat:
            OR = str(getCombinedORFromArray(oddsRatios))
            header = ['Study ID', 'Citation', 'Reported Trait(s)', 'Trait(s)', 'Odds Ratio', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
            if len(protectiveAlleles) == 0:
                protectiveAlleles = "{}"
            elif len(riskAlleles) == 0:
                riskAlleles = "{}"
            elif len(neutral_snps_set) == 0:
                neutral_snps_set = "{}"
            newLine = [studyID, citation, reportedTrait, traits, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
            formatFullCSV(isFirst, newLine, header)
            isFirst = False

        if isCondensedFormat:
            OR = str(getCombinedORFromArray(oddsRatios))
            header = ['Study ID', 'Citation', 'Reported Trait(s)', 'Trait(s)', 'Polygenic Risk Score']
            newLine = [studyID, citation, reportedTrait, traits, OR]
            formatFullCSV(isFirst, newLine, header)
            isFirst = False

def vcfcalculations(tableObjList, vcfObj, isCondensedFormat, neutral_snps, outputFile):
    condensed_output_map = {}
    # For every sample in the vcf nested dictionary
    isFirst = True
    samples = []
    for study_samp in vcfObj:
        studyID, samp = study_samp
        samples.append(samp)
        oddsRatios = []
        neutral_snps_set = neutral_snps[study_samp]
        protectiveAlleles = set()
        riskAlleles = set()

        # Loop through each snp associated with this disease/study/sample
        for chromPos in vcfObj[study_samp]:
            
             # Also iterate through each of the alleles for the snp
            for allele in vcfObj[study_samp][chromPos]:
                allele = str(allele)
                # Then compare to the gwa study
                if chromPos in tableObjList:
                    if studyID in tableObjList[chromPos]['studies']:
                        citation = tableObjList[chromPos]['studies'][studyID]['citation']
                        reportedTraits = str(tableObjList[chromPos]['studies'][studyID]['reportedTrait'])
                        traits = str(tableObjList[chromPos]['studies'][studyID]['traits'])
                        oddsRatio = tableObjList[chromPos]['studies'][studyID]['oddsRatio']
                        riskAllele = tableObjList[chromPos]['studies'][studyID]['riskAllele']
                        rsid = tableObjList[chromPos]['snp']
                        if studyID not in condensed_output_map and isCondensedFormat:
                            condensedLine = [studyID, reportedTraits, traits, citation]
                            condensed_output_map[studyID] = condensedLine
                        if allele != "":
                            if allele == riskAllele:
                                oddsRatios.append(oddsRatio)
                                if oddsRatio < 1:
                                    if rsid is not None and rsid != "":
                                        protectiveAlleles.add(rsid)
                                    else:
                                        protectiveAlleles.add(chromPos)
                                elif oddsRatio > 1:
                                    if rsid is not None and rsid != "":
                                        riskAlleles.add(rsid)
                                    else:
                                        riskAlleles.add(chromPos)
                                else:
                                    if rsid is not None and rsid != "":
                                        neutral_snps_set.add(rsid)
                                    else:
                                        neutral_snps_set.add(chromPos)
                else:
                    neutral_snps_set.add(chromPos)
                #for row in tableObjList[disease][studyID]['associations']:
                #    if row['pos'] != 'NA':
                #        databaseChromPos = row['pos']
                #    else:
                #        databaseChromPos = "NA"
                #    if allele != "": #TODO check this 
                        # Compare the individual's snp and allele to the study row's snp and risk allele
                        # If they match, use that snp's odds ratio to the calculation
                #        if chromPos == databaseChromPos and allele == row['riskAllele']:
                #            oddsRatios.append(row['oddsRatio'])
                #            chromPosList.append(row['pos'])
                #            if row['snp'] is not None:
                #                rsids.append(row['snp'])
                    # else:
                    #     if chromPos == hg38_pos:
                    #         oddsRatios.append(row['oddsRatio'])
                    #         chromPosList.append(row['pos'])
                    #         if row['snp'] is not None:
                    #             rsids.append(row['snp'])
        if not isCondensedFormat:
            OR = str(getCombinedORFromArray(oddsRatios))
            if len(protectiveAlleles) == 0:
                protectiveAlleles = "{}"
            elif len(riskAlleles) == 0:
                riskAlleles = "{}"
            elif len(neutral_snps_set) == 0:
                neutral_snps_set = "{}"
            newLine = [samp, studyID, citation, reportedTraits, traits, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
            header = ['Sample', 'Study ID', 'Citation', 'Reported Trait(s)', 'Trait(s)', 'Odds Ratios', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
            formatFullCSV(isFirst, newLine, header, outputFile)
            isFirst = False

        if isCondensedFormat:
            newLine = condensed_output_map[studyID]
            newLine.append(str(getCombinedORFromArray(oddsRatios)))
            condensed_output_map[studyID] = newLine
            
    if isCondensedFormat:
        formatCondensedCSV(condensed_output_map, outputFile, samples)
            

def getCombinedORFromArray(oddsRatios):
    combinedOR = 0
    for oratio in oddsRatios:
        oratio = float(oratio)
        combinedOR += math.log(oratio)
    combinedOR = math.exp(combinedOR)
    combinedOR = round(combinedOR, 3)
    if not oddsRatios:
        combinedOR = "THE SAMPLE DOES NOT HAVE ANY VARIANTS FROM THIS STUDY"
    return(str(combinedOR))

def createClumpsDict(clumpsObj, isRSids):
    # Access the snp clumps
    clumpMap = defaultdict(dict)

    # Loop through each snpObj in the clump object and grab the position and clump number
    # For population clumping
    for snp in clumpsObj:
        if (isRSids):
            ident = clumpsObj[snp]['snp']
        else:
            ident = clumpsObj[snp]['pos']
        clumpNum = clumpsObj[snp]['clumpNum']
        clumpMap[ident] = clumpNum

    return clumpMap


def formatCondensedCSV(output_map, outputFile, samples):
    header = "study ID\tReportedTrait(s)\tTrait(s)\tCitation"
    samps = '\t'.join(samples)
    header = header + '\t' + str(samps)
    content = ""
    isFirst = True
    for studyID in output_map:
        newLine = output_map[studyID]
        stringNewLine = '\t'.join(newLine)
        if isFirst:
            content += stringNewLine
            isFirst = False
        else:
            content = content + '\n' + stringNewLine
    finalOutput = header + '\n' + content

#    header = ["study ID", "Reported Trait(s)", "Trait(s)", "Citation"]
    with open(outputFile, 'w', newline='') as f:
        f.write(finalOutput)

    
def formatFullCSV(isFirst, newLine, header, outputFile):
    if isFirst:
        with open(outputFile, 'w', newline='') as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(header)
            output.writerow(newLine)
    else:
        with open(outputFile, 'a', newline='') as f:
            output = csv.writer(f, delimiter='\t')
            output.writerow(newLine)
