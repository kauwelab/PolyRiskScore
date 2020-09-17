import sys
import vcf
import zipfile
import tarfile
import gzip
from collections import defaultdict
from collections import namedtuple
import json
import requests
import math

def urlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "THIS TRAIT IS NOT YET INCLUDED IN OUR DATABASE. Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()  

def convertRefGen(chrom, pos, lo):
    chrom_string = 'chr' + chrom
    hg38_pos = lo.convert_coordinate(chrom_string, int(pos))
    if hg38_pos is not None:
        chrom = hg38_pos[0][0].replace('chr','')
        pos = hg38_pos[0][1]
        final_pos = str(chrom) + ':' + str(pos)
    else:
        final_pos = hg38_pos
    return final_pos

def calculateScore(inputFile, diseaseArray, pValue, outputType, tableObjList, refGen, superPop):
    tableObjList = json.loads(tableObjList)
    if (inputFile.endswith(".txt") or inputFile.endswith(".TXT")):
        posList, pos_pval_map, studyIDs, diseaseStudyIDs = getSNPsFromTableObj(tableObjList, refGen)
        txtObj, totalVariants = parse_txt(inputFile, posList, pos_pval_map, diseaseStudyIDs, studyIDs, superPop)
        results = txtcalculations(tableObjList, txtObj,
                            totalVariants, pValue, refGen, outputType)

        return(results)

    else:
        from pyliftover import LiftOver
        lo = LiftOver(refGen, 'hg38')
        posList, pos_pval_map, studyIDs, diseaseStudyIDs = getSNPsFromTableObj(tableObjList, refGen, lo)
        vcfObj, totalVariants = parse_vcf(inputFile, posList, pos_pval_map, refGen, lo, diseaseStudyIDs, studyIDs, superPop)
        results = calculations(tableObjList, vcfObj,
                            totalVariants, pValue, refGen, lo, outputType)
        return(results)


def getSNPsFromTableObj(tableObjList, refGen, lo = None):
    posListMap = {}
    posList = []
    diseaseStudyIDs = []
    studyIDs = []
    pos_pval_map = defaultdict(dict)
    for diseaseEntry in tableObjList:
        for studyID in tableObjList[diseaseEntry]:
            diseaseStudyIDs.append((diseaseEntry, studyID))
            studyIDs.append(studyID)
            for row in tableObjList[diseaseEntry][studyID]['associations']:
                if not lo:
                    snp = row['snp']
                    pos_pval_map[studyID][snp] = row['pValue']
                    posList.append(snp)
                elif row['pos'] != 'NA':
                    chrom = row['pos'].split(':')[0]
                    pos = row['pos'].split(':')[1]
                    if refGen != 'hg38':
                        hg38_pos = convertRefGen(chrom, pos, lo)
                    else:
                        hg38_pos = str(chrom) + ':' + str(pos)
                    
                    pos_pval_map[studyID][hg38_pos] = row['pValue']
                    posList.append(row['pos'])
            posListMap[studyID] = posList
    return posList, pos_pval_map, studyIDs, diseaseStudyIDs

def getClumps(studyIDs, superPop):
    h=0
    res = {}
    for i in range(25, len(studyIDs), 25):
        params = {
        "studyIDs":studyIDs[h:i],
        "superPop":superPop
        }
        res = {**res, **urlWithParams("https://prs.byu.edu/ld_clumping", params)}
        h = i
    else:
        params = {
            "studyIDs":studyIDs[h:len(studyIDs)],
            "superPop":superPop
        }
        res = {**res, **urlWithParams("https://prs.byu.edu/ld_clumping", params)}
    return res

def parse_txt(txtFile, posList, pos_pval_map, diseaseStudyIDs, studyIDs, superPop):
    totalLines = 0 #TODO add this back in
    
    openFile = open(txtFile, 'r')
    Lines = openFile.readlines()

    # Create a defautlt dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps from the database
    clumps = getClumps(studyIDs, superPop)
    clumpMap = defaultdict(dict)

    # Loop through each study in the clump object and grab the position and clump number
    for study in clumps:
        for snpObj in clumps[study]:
            snp = snpObj['snp']
            clumpNum = snpObj['clumpNumber']
            clumpMap[study][snp] = clumpNum

    # Create a list to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_list = []

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        line = line.strip() #line should be in format of rsID:Genotype,Genotype
        snp, alleles = line.split(':')
        alleles = alleles.split(',')
        # Loop through each disease_study combination
        for disease_study in diseaseStudyIDs:
            disease, study = disease_study
            # Check to see if the snp position from this line in the file exists in the clump table for this study
            if snp in clumpMap[study]:
                # Grab the clump number associated with this study and snp 
                clumpNum = clumpMap[study][snp]
                # check if the snp is also in the PRSKB database for this study and if so, grab the pvalue
                if snp in pos_pval_map[study]:
                    # Add the disease/study tuple to the counter list because we now know at least there is
                    # at least one viable snp for this combination
                    counter_list.append(disease_study)
                    pValue = pos_pval_map[study][snp]
                    totalLines += 1
                    # Check if the disease/study combo has been used in the index snp map yet
                    if disease_study in index_snp_map:
                        # Check whether the existing index snp or current snp have a lower pvalue for this study
                        # and switch out the data accordingly
                        if clumpNum in index_snp_map[disease_study]:
                            index_snp = index_snp_map[disease_study][clumpNum]
                            index_pvalue = pos_pval_map[study][index_snp]
                            if pValue < index_pvalue:
                                del index_snp_map[disease_study][clumpNum]
                                index_snp_map[disease_study][clumpNum] = snp
                                del sample_map[disease_study][index_snp]
                                sample_map[disease_study][snp] = alleles
                        else:
                            # Since the clump number for this snp position and disease/study
                            # doesn't already exist, add it to the index map and the sample map
                            index_snp_map[disease_study][clumpNum] = snp
                            sample_map[disease_study][snp] = alleles
                    else:
                        # Since the disease/study combo wasn't already used in the index map, add it to both the index and sample map
                        index_snp_map[disease_study][clumpNum] = snp
                        sample_map[disease_study][snp] = alleles

            if disease_study not in counter_list:
                sample_map[disease_study][""] = ""
   
    openFile.close()
    final_map = dict(sample_map)
    return final_map, totalLines


def parse_vcf(inputFile, posList, pos_pval_map, refGen, lo, diseaseStudyIDs, studyIDs, superPop):
    filename = inputFile
    totalLines = 0 #TODO add this functionality back
    # Check if the file is zipped
    if filename.endswith(".zip"):
        # If the file is zipped, extract it
        with zipfile.ZipFile(filename, "r") as zipObj:
            zipObj.extractall("./")
        # Access the new name of the file (without .zip)
        temps = filename.split('.zip')
        norm_file = temps[0]
        # Use the vcf reader to open the newly unzipped file
        vcf_reader = vcf.Reader(open(norm_file, "r"))
    # Check if file is gzipped and open it with vcf reader
    elif filename.endswith(".gz") or filename.endswith(".gzip") or filename.endswith(".tgz"):
        vcf_reader = vcf.Reader(filename=filename)
        # If the file is normal, open it with the vcf reader
    else:
        vcf_reader = vcf.Reader(open(filename, "r"))
    # Create a defautlt dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps from the database
    clumps = getClumps(studyIDs, superPop)
    clumpMap = defaultdict(dict)

    # Loop through each study in the clump object and grab the position and clump number
    for study in clumps:
        for snpObj in clumps[study]:
            hg38_pos = snpObj['hg38_pos']
            clumpNum = snpObj['clumpNumber']
            clumpMap[study][hg38_pos] = clumpNum

    # Create a list to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_list = []

    # Iterate through each line in the vcf file
    for record in vcf_reader:
        chrom = record.CHROM
        pos = record.POS
        ALT = record.ALT
        REF = record.REF
        # If the refGen isn't hg38, convert it to hg38
        if refGen != 'hg38':
            chromPos = convertRefGen(chrom, pos, lo)
        else:
            chromPos = str(record.CHROM) + ":" + str(record.POS)
        # Loop through each disease_study combination
        for disease_study in diseaseStudyIDs:
            disease, study = disease_study
            # Loop through each sample of the vcf file
            for call in record.samples:  
                gt = call.gt_bases    
                name = call.sample 
                genotype = record.genotype(name)['GT']
                # Create a tuple with the disease, study, and sample name
                disease_study_name = (disease, study, name)
                # Check to see if the snp position from this line in the vcf exists in the clump table for this study
                if chromPos in clumpMap[study]:
                    # Grab the clump number associated with this study and snp position
                    clumpNum = clumpMap[study][chromPos] 
                    # check if the snp position is also in the PRSKB database for this study and if so, grab the pvalue
                    if chromPos in pos_pval_map[study]:
                        # Add the disease/study/sample tuple to the counter list because we now know at least there is
                        # at least one viable snp for this combination
                        counter_list.append(disease_study_name)
                        pValue = pos_pval_map[study][chromPos]
                        totalLines += 1
                        # Check whether the genotype for this sample and snp exists
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
                                        alleles.append(ALT[0])
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
#                        if gt is not None:
#                            if "|" in gt:
#                                alleles = gt.split('|')
#                            elif "/" in gt:
#                                alleles = gt.split('/')
#                            else:
#                                alleles = list(gt)
#                        else:
#                            alleles=""
                        # Check if the disease/study/name combo has been used in the index snp map yet
                        if disease_study_name in index_snp_map:
                            # if the clump number for this snp position and disease/study/name is alraedy in the index map, move forward
                            if clumpNum in index_snp_map[disease_study_name]:
                                # Check whether the existing index snp or current snp have a lower pvalue for this study
                                # and switch out the data accordingly
                                # if the current snp position has no alleles, do not add it to the maps
                                # if the existing index snp has no alleles, put in the current snp even if the pvalue is higher
                                index_snp = index_snp_map[disease_study_name][clumpNum]
                                index_pvalue = pos_pval_map[study][index_snp]
                                if pValue < index_pvalue and alleles != "":
                                    del index_snp_map[disease_study_name][clumpNum]
                                    index_snp_map[disease_study_name][clumpNum] = chromPos
                                    del sample_map[disease_study_name][index_snp]
                                    sample_map[disease_study_name][chromPos] = alleles
                                elif pValue > index_pvalue and alleles != "":
                                    if chromPos in sample_map[disease_study_name]:
                                        if sample_map[disease_study_name][chromPos] == "":
                                            del index_snp_map[disease_study_name][clumpNum]
                                            index_snp_map[disease_study_name][clumpNum] = chromPos
                                            del sample_map[disease_study_name][index_snp]
                                            sample_map[disease_study_name][chromPos] = alleles
                            else:
                                # Since the clump number for this snp position and disease/study/name
                                # doesn't already exist, add it to the index map and the sample map
                                index_snp_map[disease_study_name][clumpNum] = chromPos
                                sample_map[disease_study_name][chromPos] = alleles
                        else:
                            # Since the disease/study/name combo wasn't already used in the index map, add it to both the index and sample map
                            index_snp_map[disease_study_name][clumpNum] = chromPos
                            sample_map[disease_study_name][chromPos] = alleles

            # Check to see which disease/study/sample combos didn't have any viable snps
            # and create blank entries for the sample map for those that didn't
            for name in vcf_reader.samples:
                disease_study_name = (disease, study, name)
                if disease_study_name not in counter_list:
                    sample_map[disease_study_name][""] = ""

    
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


def calculations(tableObjList, vcfObj, totalVariants, pValue, refGen, lo, outputType):
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
                        chrom = row['pos'].split(':')[0]
                        pos = row['pos'].split(':')[1]
                        if refGen != 'hg38':
                            hg38_pos = convertRefGen(chrom, pos, lo)
                        else:
                            hg38_pos = str(chrom) + ':' + str(pos)
                    else:
                        hg38_pos = "NA"
                    if allele != "": #TODO check this 
                        # Compare the individual's snp and allele to the study row's snp and risk allele
                        # If they match, use that snp's odds ratio to the calculation
                        if chromPos == hg38_pos and allele == row['riskAllele']:
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
