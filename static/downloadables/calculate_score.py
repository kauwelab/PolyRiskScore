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
    tableObjDict = json.loads(tableObjDict)
    clumpsObjDict = json.loads(clumpsObjDict)

    # tells us if we were passed rsIDs or a vcf
    isRSids = True if inputFile.lower().endswith(".txt") else False

    if isRSids:
        txtObj, totalVariants, neutral_snps = parse_txt(inputFile, clumpsObjDict, tableObjDict)
        results = txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps, outputFile)#TODO this fuction still needs to be formatted for the new stuff
    else:
        vcfObj, totalVariants, neutral_snps, study_dict = parse_vcf(inputFile, clumpsObjDict, tableObjDict)
        results = vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps, outputFile, study_dict) #TODO this fuction still needs to be formatted for the new stuff
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
            if snp in tableObjDict:
                for studyID in tableObjDict[snp]['studies'].keys():
                    if studyID in neutral_snps:
                        neutral_snps_set = neutral_snps[studyID]
                    else:
                        neutral_snps_set = set()
                    # Check to see if the snp position from this line in the file exists in the clump table
                    if snp in clumpsObjDict:
                        # Grab the clump number associated with this snp 
                        clumpNum = clumpsObjDict[snp]['clumpNum']
                        pValue = tableObjDict[snp]['studies'][studyID]['pValue']
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
                                index_pvalue = tableObjDict[index_snp]['studies'][studyID]['pValue']
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
                    # The snp wasn't in the clump map (meaning it wasn't i 1000 Genomes), so add it
                    else:
                        sample_map[studyID][snp] = alleles
                        counter_set.add(studyID)

                    neutral_snps[studyID] = neutral_snps_set

                #TODO check this
                if studyID not in counter_set:
                    sample_map[studyID][""] = ""

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


def getStudies(tableObjDict):
    study_dict = {}
    for key in tableObjDict.keys():
        for study in tableObjDict[key]['studies'].keys():
            study_dict[study] = key
    return(study_dict)


def parse_vcf(inputFile, clumpsObjDict, tableObjDict):
    totalLines = 0 
    study_dict = getStudies(tableObjDict)

    vcf_reader = openFileForParsing(inputFile)
    
    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a list to keep track of which study/samples have viable snps and which ones don't 
    counter_set = set()
    neutral_snps = {}
    rsid_pos_map = {}

    # Iterate through each line in the vcf file
    try:
        for record in vcf_reader:
            chromPos = str(record.CHROM) + ":" + str(record.POS)

            ALT = record.ALT
            REF = record.REF #TODO: check if this is right or if it should just be .REF
            rsid = record.ID
            # if the position is found in our database 
            if chromPos in tableObjDict:
                # Loop through each study containing the position
                for study in tableObjDict[chromPos]['studies'].keys():

                    # Loop through each sample of the vcf file
                    for call in record.samples:  
                        gt = call.gt_bases    
                        name = call.sample
                        genotype = record.genotype(name)['GT']
                        alleles = formatAndReturnGenotype(genotype, gt, REF, ALT)
                        neutral_snps_set = set()
                        # Create a tuple with the study and sample name
                        study_sample = (study, name)
                        counter_set.add(study_sample)
                        # Check to see if the snp position from this line in the vcf exists in the clump table for this study
                        if chromPos in clumpsObjDict:
                            # Grab the clump number associated with this study and snp position
                            clumpNum = clumpsObjDict[chromPos]['clumpNum'] 

                            # grab pValue from PRSBK database data
                            pValue = tableObjDict[chromPos]['studies'][study]['pValue']
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
                                    index_pvalue = tableObjDict[index_snp]['studies'][study]['pValue'] 
                                    if pValue < index_pvalue:
                                        del index_snp_map[study_sample][clumpNum]
                                        index_snp_map[study_sample][clumpNum] = chromPos
                                        del sample_map[study_sample][index_snp]
                                        sample_map[study_sample][chromPos] = alleles

                                        if index_snp in rsid_pos_map:
                                            if rsid_pos_map[index_snp] is not None:
                                                neutral_snps_set.add(rsid_pos_map[index_snp])
                                            else:
                                                neutral_snps_set.add(index_snp)
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

                                            if index_snp in rsid_pos_map:
                                                if rsid_pos_map[index_snp] is not None:
                                                    neutral_snps_set.add(rsid_pos_map[index_snp])
                                                else:
                                                    neutral_snps_set.add(index_snp)
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
            for study in study_dict:
                study_sample = (study, name)
                if study_sample not in counter_set:
                    sample_map[study_sample][""] = ""
    except AttributeError:
        raise SystemExit("ERROR: Some lines in the VCF are not formatted correctly. Make sure each line includes the GT format.")
    
    final_map = dict(sample_map)
    return final_map, totalLines, neutral_snps, study_dict


def txtcalculations(tableObjDict, txtObj, isCondensedFormat, neutral_snps, outputFile):
    # Loop through every disease/study in the txt nested dictionary
    isFirst = True
    for studyID in txtObj:
        oddsRatios = []
        neutral_snps_set = neutral_snps[studyID]
        protectiveAlleles = set()
        riskAlleles = set()

        
        # Loop through each snp associated with this disease/study
        for snp in txtObj[studyID]:
            # Also iterate through each of the alleles
            for allele in txtObj[studyID][snp]:
                # Then compare to the gwa study
                if allele != "":
                    if snp in tableObjDict:
                        if studyID in tableObjDict[snp]['studies']:
                            # Compare the individual's snp and allele to the study row's snp and risk allele
                            citation = tableObjDict[snp]['studies'][studyID]['citation']
                            reportedTrait = tableObjDict[snp]['studies'][studyID]['reportedTrait']
                            traits = tableObjDict[snp]['studies'][studyID]['traits']
                            riskAllele = tableObjDict[snp]['studies'][studyID]['riskAllele']
                            oddsRatio = tableObjDict[snp]['studies'][studyID]['oddsRatio']

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
            header = ['Study ID', 'Citation', 'Reported Trait(s)', 'Trait(s)', 'Odds Ratio', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
            if str(protectiveAlleles) == "set()":
                protectiveAlleles = "None"
            elif str(riskAlleles) == "set()":
                riskAlleles = "None"
            elif str(neutral_snps_set) == "set()":
                neutral_snps_set = "None"
            newLine = [studyID, citation, reportedTrait, traits, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
            formatFullCSV(isFirst, newLine, header, outputFile)
            isFirst = False

        if isCondensedFormat:
            OR = str(getCombinedORFromArray(oddsRatios))
            header = ['Study ID', 'Citation', 'Reported Trait(s)', 'Trait(s)', 'Polygenic Risk Score']
            newLine = [studyID, citation, reportedTrait, traits, OR]
            formatFullCSV(isFirst, newLine, header, outputFile)
            isFirst = False


def vcfcalculations(tableObjDict, vcfObj, isCondensedFormat, neutral_snps, outputFile, study_dict):
    condensed_output_map = {}
    # For every sample in the vcf nested dictionary
    isFirst = True
    samples = {}
    for study_samp in vcfObj:
        studyID, samp = study_samp
        samples[samp]=None
        oddsRatios = []
        if study_samp in neutral_snps:
            neutral_snps_set = neutral_snps[study_samp]
        else:
            neutral_snps_set = set()
        protectiveAlleles = set()
        riskAlleles = set()

        # Loop through each snp associated with this disease/study/sample
        for chromPos in vcfObj[study_samp]:
            
             # Also iterate through each of the alleles for the snp

            for allele in vcfObj[study_samp][chromPos]:
                allele = str(allele)
                # Then compare to the gwa study
            if chromPos in tableObjDict:
                if studyID in tableObjDict[chromPos]['studies']:
                    citation = tableObjDict[chromPos]['studies'][studyID]['citation']
                    reportedTraits = str(tableObjDict[chromPos]['studies'][studyID]['reportedTrait'])
                    traits = str(tableObjDict[chromPos]['studies'][studyID]['traits'])
                    oddsRatio = tableObjDict[chromPos]['studies'][studyID]['oddsRatio']
                    riskAllele = tableObjDict[chromPos]['studies'][studyID]['riskAllele']
                    rsid = tableObjDict[chromPos]['snp']
                    if studyID not in condensed_output_map and isCondensedFormat:
                        condensedLine = [studyID, reportedTraits, traits, citation]
                        condensed_output_map[studyID] = condensedLine
                    alleles = vcfObj[study_samp][chromPos]
                    if alleles != "" and alleles is not None:
                        for allele in alleles:
                            allele = str(allele)
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
                                    if rsid is not None and rsid != "":
                                        neutral_snps_set.add(rsid)
                                    else:
                                        neutral_snps_set.add(chromPos)
            else:
                neutral_snps_set.add(chromPos)
                #for row in tableObjDict[disease][studyID]['associations']:
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
            if str(protectiveAlleles) == "set()":
                protectiveAlleles = "None"
            elif str(riskAlleles) == "set()":
                riskAlleles = "None"
            elif str(neutral_snps_set) == "set()":
                neutral_snps_set = "None"
            newLine = [samp, studyID, citation, reportedTraits, traits, OR, str(protectiveAlleles), str(riskAlleles), str(neutral_snps_set)]
            header = ['Sample', 'Study ID', 'Citation', 'Reported Trait(s)', 'Trait(s)', 'Odds Ratios', 'Protective Variants', 'Risk Variants', 'Variants with Unknown Effect']
            formatFullCSV(isFirst, newLine, header, outputFile)
            isFirst = False

        if isCondensedFormat:
            if studyID in condensed_output_map:
                newLine = condensed_output_map[studyID]
                newLine.append(str(getCombinedORFromArray(oddsRatios)))
                condensed_output_map[studyID] = newLine
            else:
                key = study_dict[studyID]
                citation = tableObjDict[key]['studies'][studyID]['citation']
                reportedTraits = tableObjDict[key]['studies'][studyID]['reportedTrait']
                traits = tableObjDict[key]['studies'][studyID]['traits']
                newLine = [studyID, str(reportedTraits), str(traits), citation, 'NF']
                condensed_output_map[studyID] = newLine

            

    if isCondensedFormat:
        formatCondensedCSV(condensed_output_map, outputFile, samples)
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


def formatCondensedCSV(output_map, outputFile, samples):
    header = "study ID\tReportedTrait(s)\tTrait(s)\tCitation"
    samps = '\t'.join(samples.keys())
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
    return


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
    return
