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

def convertRefGen(chrom, pos, refGen):
    lo = LiftOver(refGen, 'hg38')
    chrom_string = 'chr' + chrom
    hg38_pos = lo.convert_coordinate(chrom_string, int(pos))
    chrom = hg38_pos[0][0].replace('chr','')
    pos = hg38_pos[0][1]
    final_pos = str(chrom) + ':' + str(pos)
    return final_pos

def calculateScore(inputFile, diseaseArray, pValue, outputType, tableObjList, refGen, superPop):
    sample = open('samplefile.txt', 'w') 
  
    tableObjList = json.loads(tableObjList)
    if (inputFile.endswith(".txt") or inputFile.endswith(".TXT")):
        posList, pos_pval_map, studyIDs, diseaseStudyIDs = getSNPsFromTableObj(tableObjList, refGen, True)
        txtObj, totalVariants = parse_txt(inputFile, posList, pos_pval_map, diseaseStudyIDs, studyIDs, superPop)
        results = txtcalculations(tableObjList, txtObj,
                            totalVariants, pValue, refGen, outputType)

        print(results, file = sample) 
        sample.close() 
        return(results)

    else:
        from pyliftover import LiftOver
        posList, pos_pval_map, studyIDs, diseaseStudyIDs = getSNPsFromTableObj(tableObjList, refGen)
        vcfObj, totalVariants = parse_vcf(inputFile, posList, pos_pval_map, refGen, diseaseStudyIDs, studyIDs, superPop)
        results = calculations(tableObjList, vcfObj,
                            totalVariants, pValue, refGen, outputType)
        return(results)


def getSNPsFromTableObj(tableObjList, refGen, isTxt = False):
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
                if (isTxt):
                    snp = row['snp']
                    pos_pval_map[studyID][snp] = row['pValue']
                    posList.append(snp)
                else:
                    chrom = row['pos'].split(':')[0]
                    pos = row['pos'].split(':')[1]
                    if refGen != 'hg38':
                        hg38_pos = convertRefGen(chrom, pos, refGen)
                    else:
                        hg38_pos = str(chrom) + ':' + str(pos)
                    pos_pval_map[studyID][hg38_pos] = row['pValue']
                    posList.append(row['pos'])
            posListMap[studyID] = posList
    return posList, pos_pval_map, studyIDs, diseaseStudyIDs

def getClumps(studyIDs, superPop):
    if studyIDs is None:
        #TODO: get all of the studies
        test=""
    else:
        params = {
                "studyIDs":studyIDs,
                "superPop":superPop
        }
        res = urlWithParams("https://prs.byu.edu/ld_clumping", params)
    return res

def parse_txt(txtFile, posList, pos_pval_map, diseaseStudyIDs, studyIDs, superPop):
    matchedSNPs = 0
    totalLines = 0
    
    openFile = open(txtFile, 'r')
    Lines = openFile.readlines()
    count = 0

    # Create a defautlt dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps from the database
    clumps = getClumps(studyIDs, superPop)
    clumpMap = defaultdict(dict)

    output = open('output.txt', 'w')
    for study in clumps:
        for snpObj in clumps[study]:
            snp = snpObj['snp']
            clumpNum = snpObj['clumpNumber']
            clumpMap[study][snp] = clumpNum

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        line = line.strip() #line should be in format of rsID:Genotype,Genotype
        snp, alleles = line.split(':')
        alleles = alleles.split(',')
        for disease_study in diseaseStudyIDs:
            disease, study = disease_study
            if snp in clumpMap[study]:
                clumpNum = clumpMap[study][snp]
                if snp in pos_pval_map[study]:
                    pValue = pos_pval_map[study][snp]
                    totalLines += 1
                    matchedSNPs += 1
                    if disease_study in index_snp_map:
                        if clumpNum in index_snp_map[disease_study]:
                            index_snp = index_snp_map[disease_study][clumpNum]
                            index_pvalue = pos_pval_map[study][index_snp]
                            if pvalue < index_pvalue:
                                del index_snp_map[disease_study][clumpNum]
                                index_snp_map[disease_study][clumpNum] = snp
                                del sample_map[disease_study][index_snp]
                                sample_map[disease_study][snp] = alleles
                        else:
                            index_snp_map[disease_study][clumpNum] = snp
                            sample_map[disease_study][snp] = alleles
                    else:
                        index_snp_map[disease_study][clumpNum] = snp
                        sample_map[disease_study][snp] = alleles
            if matchedSNPs == 0:
                for name in vcf_reader.samples:
                    sample_map[disease_study][""] = ""
    final_map = dict(sample_map)
    output.write(str(final_map))
    output.close()
    return final_map, totalLines


def parse_vcf(inputFile, posList, pos_pval_map, refGen, diseaseStudyIDs, studyIDs, superPop):
    filename = inputFile
    matchedSNPs = 0
    totalLines = 0
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

    output = open('output.txt', 'w')
    for study in clumps:
        for snpObj in clumps[study]:
            hg38_pos = snpObj['hg38_pos']
            clumpNum = snpObj['clumpNumber']
            clumpMap[study][hg38_pos] = clumpNum

    # Iterate through each record in the file and save the SNP rs ID
    for record in vcf_reader:
        snp = record.ID
        chrom = record.CHROM
        pos = record.POS
        if refGen != 'hg38':
            chromPos = convertRefGen(chrom, pos, refGen)
        else:
            chromPos = str(record.CHROM) + ":" + str(record.POS)
        for disease_study in diseaseStudyIDs:
            disease, study = disease_study
            if chromPos in clumpMap[study]:
                clumpNum = clumpMap[study][chromPos]
                # Look up the pvalue from hte map that was given as a parameter to this function
                if chromPos in pos_pval_map[study]:
                    pValue = pos_pval_map[study][chromPos]
                    totalLines += 1
                    matchedSNPs += 1
                # if snp:  # If the SNP rs ID exists, move forward
                    for call in record.samples:  # Iterate through each of the samples for the record
                        gt = call.gt_bases     # Save the genotype bases
                        name = call.sample     # Save the name of the sample
                        # Create a list of the genotype alleles
                        if gt is not None:
                            if "|" in gt:
                                alleles = gt.split('|')
                            elif "/" in gt:
                                alleles = gt.split('/')
                            else:
                                alleles = list(gt)
                        # Add to the nested map so that the outer key = sample name; value = inner map--where key = SNP ID and value = allele list
                            disease_study_name = (disease, study, name)
                            if disease_study_name in index_snp_map:
                                if clumpNum in index_snp_map[disease_study_name]:
                                    index_snp = index_snp_map[disease_study_name][clumpNum]
                                    index_pvalue = pos_pval_map[study][index_snp]
                                    if pvalue < index_pvalue:
                                        del index_snp_map[disease_study_name][clumpNum]
                                        index_snp_map[disease_study_name][clumpNum] = chromPos
                                        del sample_map[disease_study_name][index_snp]
                                        sample_map[disease_study_name][chromPos] = alleles
                                else:
                                    index_snp_map[disease_study_name][clumpNum] = chromPos
                                    sample_map[disease_study_name][chromPos] = alleles
                            else:
                                index_snp_map[disease_study_name][clumpNum] = chromPos
                                sample_map[disease_study_name][chromPos] = alleles
            if matchedSNPs == 0:
                for name in vcf_reader.samples:
                    disease_study_name = (disease, study, name)
                    sample_map[disease_study_name][""] = ""
    final_map = dict(sample_map)
    output.write(str(final_map))
    output.close()
    return final_map, totalLines


def txtcalculations(tableObjList, txtObj, totalVariants, pValue, refGen, outputType):
    output2 = open('output2.txt', 'a')
    resultJsons = []
    resultJsons.append({
        "pValueCutoff": pValue,
        "totalVariants": totalVariants
    })
    # For every sample in the vcf nested dictionary
    for disease_study in txtObj:
        disease, studyID = disease_study
        diseases = []   
        # For each disease in the table object (list of diseaseRows which are disease names with list of studyrows)
        #for diseaseEntry in tableObjList:
        studies = []
        diseaseResults = {}
            # Iterate through each of the studies pertaining to the disease
        #    for studyID in tableObjList[diseaseEntry]:
        oddRatios = []
        rsids = []
        # chromPosList = []
        studyResults = {}
                # Create a tuple with study and sample name
#        study_samp = (studyID, samp)
                # For each study, iterate through the snps related to the sample
        
        for snp in txtObj[disease_study]:
                    # Also iterate through each of the alleles
            for allele in txtObj[disease_study][snp]:
                        # Then compare to the data in each row of the study
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
    output2.close()


def calculations(tableObjList, vcfObj, totalVariants, pValue, refGen, outputType):
    output2 = open('output2.txt', 'a')
    resultJsons = []
    resultJsons.append({
        "pValueCutoff": pValue,
        "totalVariants": totalVariants
    })
    # For every sample in the vcf nested dictionary
    for disease_study_samp in vcfObj:
        disease, studyID, samp = disease_study_samp
        diseases = []    # Each sample will have its own array of diseaseResults
        # For each disease in the table object (list of diseaseRows which are disease names with list of studyrows)
        #for diseaseEntry in tableObjList:
        studies = []
        diseaseResults = {}
            # Iterate through each of the studies pertaining to the disease
        #    for studyID in tableObjList[diseaseEntry]:
        oddRatios = []
        rsids = []
        chromPosList = []
        studyResults = {}
                # Create a tuple with study and sample name
#        study_samp = (studyID, samp)
                # For each study, iterate through the snps related to the sample
        
        for chromPos in vcfObj[disease_study_samp]:
                    # Also iterate through each of the alleles
            for allele in vcfObj[disease_study_samp][chromPos]:
                        # Then compare to the data in each row of the study
                for row in tableObjList[disease][studyID]['associations']:
                    chrom = row['pos'].split(':')[0]
                    pos = row['pos'].split(':')[1]
                    if refGen != 'hg38':
                        hg38_pos = convertRefGen(chrom, pos, refGen)
                    else:
                        hg38_pos = str(chrom) + ':' + str(pos)
                    if allele != None:
                        # Compare the individual's snp and allele to the study row's snp and risk allele
                        if chromPos == hg38_pos and allele == row['riskAllele']:
                            oddRatios.append(row['oddsRatio'])
                            chromPosList.append(row['pos'])
                            if row['snp'] is not None:
                                rsids.append(row['snp'])
                    #TODO: is this correct? do we add the OR and snp to the calculation if the allele is None? This theoretically shouldn't be happening, right?
                    # Because the only way the snp was added to the individual in the sample map was if the genotype was not None. Maybe one of their
                    # alleles could be None, though? In which case we shouldn't add it to the calculation, correct?
                    else:
                        if chromPos == hg38_pos:
                            oddRatios.append(row['oddsRatio'])
                            chromPosList.append(row['pos'])
                            if row['snp'] is not None:
                                rsids.append(row['snp'])
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
    output2.close()

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
                line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + str(oddsRatio) + "," + \
                    str(percentile) + "," + str(numSNPsinOR)
                line += "," + str(chromPosinOR) + "," + str(snpsinOR) if (name != "fromTextFile") else "," + str(snpsinOR)
                    # "," + str(chromPosinOR) + "," + str(snpsinOR)
                finalText += "\n" + line
    finalText += '\n'
    return finalText
