from pyliftover import LiftOver
import sys
import vcf
import zipfile
import tarfile
import gzip
from collections import defaultdict
from collections import namedtuple
import json
import math
import ast
import requests
import time
import datetime
import re

def grepRes(pValue, refGen, traits, studyTypes, studyIDs, ethnicity):
    if traits != "":
        traits = traits.split(" ")
    else:
        None
#    traits = traits.split(" ") if traits != "" else None
    traits = [sub.replace('_', ' ') for sub in traits]
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None

    if (studyTypes is None and studyIDs is None and ethnicity is None):
        toReturn = getAllAssociations(pValue, refGen, traits)
    else:
        toReturn = getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity)
    
    print('%'.join(toReturn))


def getAllAssociations(pValue, refGen, traits = ""): 
    if traits == []:
        traits = getAllTraits()
    associations = getAssociations("https://prs.byu.edu/all_associations", traits, pValue, refGen)
    return formatAssociationsForReturn(associations)


def getSpecificAssociations(pValue, refGen, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
    studyIDspecificData = {}

    if (studyIDs is not None):
        url_get_by_study_id = "https://prs.byu.edu/get_studies_by_id"
        params = {
            "ids": studyIDs
        }
        studyIDspecificData = urlWithParams(url_get_by_study_id, params)

    if traits is None and studyTypes is not None:
        traits = getAllTraits()
    elif traits is not None:
        if studyTypes is None:
            studyTypes = ["HI", "LC", "O"]

    if traits is not None and studyTypes is not None:
        params = {
            "traits": traits, 
            "studyTypes": studyTypes,
            "ethnicities": ethnicity
        }
        traitData = {**urlWithParams("https://prs.byu.edu/get_studies", params)}

    if traitData:
        finalTraitList = []
        for trait in traitData:
            tmpStudyHolder = []
            for study in traitData[trait]:
                tmpStudyHolder.append(study["studyID"])
            
            traitObj = {
                "trait": trait,
                "studies": tmpStudyHolder
            }
            finalTraitList.append(traitObj)

    if studyIDspecificData:
        # this will need to be fixed
        for obj in studyIDspecificData:
            if obj["trait"] in finalTraitList and obj["studyID"] not in finalTraitList[obj["trait"]]:
                finalTraitList[obj["trait"]].append(obj["studyID"])
            else:
                finalTraitList[obj["trait"]] = [obj["studyID"]]

    associations = getAssociations("https://prs.byu.edu/get_associations", finalTraitList, pValue, refGen, 1)
    return formatAssociationsForReturn(associations)


def getAssociations(url, traits, pValue, refGen, turnString = None):
    associations = {}
    h=0
    for i in range(25, len(traits), 25):
        params = {
            "traits": json.dumps(traits[h:i]) if turnString else traits[h:i],
            "pValue": pValue,
            "refGen": refGen
        }
        associations = {**associations, **urlWithParams(url, params)}
        h = i
    else:
        params = {
            "traits": json.dumps(traits[h:len(traits)]) if turnString else traits[h:len(traits)],
            "pValue": pValue,
            "refGen": refGen
        }
        associations = {**associations, **urlWithParams(url, params)}
    return associations


def formatAssociationsForReturn(associations):
    snps = "-e #CHROM "
    for disease in associations:
        for study in associations[disease]:
            for association in associations[disease][study]["associations"]:
                if association['pos'] != 'NA':
                    snps += "-e {0} ".format(association['pos'].split(":")[1])

    associations = json.dumps(associations)
    return [snps, associations]


def getAllTraits():
    url_t = "https://prs.byu.edu/get_traits"
    response = requests.get(url=url_t)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()


def urlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
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

def calculateScore(vcfFile, diseaseArray, pValue, outputType, tableObjList, refGen, superPop):
    tableObjList = json.loads(tableObjList)
    posList, pos_pval_map, studyIDs, diseaseStudyIDs, lo = getSNPsFromTableObj(tableObjList, refGen)
    vcfObj, totalVariants = parse_vcf(vcfFile, posList, pos_pval_map, refGen, lo, diseaseStudyIDs, studyIDs, superPop)
    results = calculations(tableObjList, vcfObj,
                           totalVariants, pValue, refGen, lo, outputType)
    return(results)


def getSNPsFromTableObj(tableObjList, refGen):
    lo = LiftOver(refGen, 'hg38')
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
                if row['pos'] != 'NA':
                    chrom = row['pos'].split(':')[0]
                    pos = row['pos'].split(':')[1]
                    if refGen != 'hg38':
                        hg38_pos = convertRefGen(chrom, pos, lo)
                    else:
                        hg38_pos = str(chrom) + ':' + str(pos)
                
                    pos_pval_map[studyID][hg38_pos] = row['pValue']
                    posList.append(row['pos'])
            posListMap[studyID] = posList
    return posList, pos_pval_map, studyIDs, diseaseStudyIDs, lo

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

def parse_vcf(vcfFile, posList, pos_pval_map, refGen, lo, diseaseStudyIDs, studyIDs, superPop):
    filename = vcfFile
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
    # Create a defautlt dictionary  to hold the final output of this function (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps from the database and create a default dict to hold the clumps
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
                        # Check whether the genotype for this sample and snp exists
                        if gt is not None:
                            if "|" in gt:
                                alleles = gt.split('|')
                            elif "/" in gt:
                                alleles = gt.split('/')
                            else:
                                alleles = list(gt)
                        else:
                            alleles=""
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


def calculations(tableObjList, vcfObj, totalVariants, pValue, refGen, lo, outputType):
    resultJsons = []
    resultJsons.append({
        "pValueCutoff": pValue,
        "totalVariants": totalVariants
    })
    # Loop through every disease/study/sample in the vcf nested dictionary
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
                    if allele != "":
                        # Compare the individual's snp and allele to the gwa study's snp and risk allele
                        # If they match, use that snp's odds ratio to the calculation
                        if chromPos == hg38_pos and allele == row['riskAllele']:
                            oddRatios.append(row['oddsRatio'])
                            chromPosList.append(row['pos'])
                            if row['snp'] is not None:
                                rsids.append(row['snp'])
                    #else:
                    #    if chromPos == hg38_pos:
                    #        oddRatios.append(row['oddsRatio'])
                    #        chromPosList.append(row['pos'])
                    #        if row['snp'] is not None:
                    #            rsids.append(row['snp'])
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
    output3.close()

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
                chromPosinOR = ";".join(studyEntry['chromPositionsIncluded'])
                snpsinOR = ";".join(studyEntry['snpsIncluded'])
                if numSNPsinOR > 0:
                    line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + str(oddsRatio) + "," + \
                        str(percentile) + "," + str(numSNPsinOR) + \
                        "," + str(chromPosinOR) + "," + str(snpsinOR)
                else:
                    line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + "NO VARIANTS FROM THIS STUDY WERE PRESENT IN THIS INDIVIDUAL"
                finalText += "\n" + line
    finalText += '\n'
    return finalText

