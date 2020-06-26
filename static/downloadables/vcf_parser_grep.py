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


def grepRes(pValue, refGen, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
    if (studyTypes is None and studyIDs is None and ethnicity is None):
        toReturn = getAllAssociations(pValue, refGen, traits)
    else:
        toReturn = getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity)
    return '%'.join(toReturn)


def getAllAssociations(pValue, refGen, traits = None): 
    if (traits is None):
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
            "studyTypes": studyTypes
        }
        traitData = {**urlWithParams("https://prs.byu.edu/get_studies", params)}

    if traitData:
        # filter for ethnicity
        finalTraitList = []
        for trait in traitData:
            tmpStudyHolder = []
            for study in traitData[trait]:
                if (ethnicity and ethnicity.lower() in study["ethnicity"].lower() and study["studyID"] not in tmpStudyHolder):
                    tmpStudyHolder.append(study["studyID"])
                elif not ethnicity and study["studyID"] not in tmpStudyHolder:
                    tmpStudyHolder.append(study["studyID"])
            
            traitObj = {
                "trait": trait,
                "studyIDs": tmpStudyHolder
            }
            finalTraitList.append(traitObj)

    if studyIDspecificData:
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
    for i in range(100, len(traits), 100):
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
                snps += "-e {0} ".format(association['pos'])

    associations = json.dumps(associations)
    return (snps, associations)


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


def calculateScore(vcfFile, diseaseArray, pValue, outputType, tableObjList):
    tableObjList = json.loads(tableObjList)
    posList = getSNPsFromTableObj(tableObjList)
    vcfObj, totalVariants = parse_vcf(vcfFile, posList)
    results = calculations(tableObjList, vcfObj,
                           totalVariants, pValue, outputType)
    return(results)


def getSNPsFromTableObj(tableObjList):
    posList = []
    for diseaseEntry in tableObjList:
        for studyEntry in diseaseEntry['studiesRows']:
            for row in studyEntry['rows']:
                posList.append(row['pos'])
    return posList


def parse_vcf(vcfFile, posList):
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
    # Create a defautlt dictionary (nested dictionary)
    sample_map = defaultdict(dict)

    # Iterate through each record in the file and save the SNP rs ID
    for record in vcf_reader:
        snp = record.ID
        chrom = record.CHROM
        pos = record.POS
        chromPos = str(record.CHROM) + ":" + str(record.POS)
        totalLines += 1
        if (chromPos in posList):
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
                    sample_map[name][chromPos] = alleles
    if matchedSNPs == 0:
        for name in vcf_reader.samples:
            sample_map[name][""] = ""
    final_map = dict(sample_map)
    return final_map, totalLines


def calculations(tableObjList, vcfObj, totalVariants, pValue, outputType):
    resultJsons = []
    resultJsons.append({
        "pValueCutoff": pValue,
        "totalVariants": totalVariants
    })
    # For every sample in the vcf nested dictionary
    for samp in vcfObj:
        diseases = []    # Each sample will have its own array of diseaseResults
        # For each disease in the table object (list of diseaseRows which are disease names with list of studyrows)
        for diseaseEntry in tableObjList:
            studies = []
            diseaseResults = {}
            # Iterate through each of the studies pertaining to the disease
            for studyEntry in diseaseEntry['studiesRows']:
                oddRatios = []
                rsids = []
                chromPosList = []
                studyResults = {}
                # For each study, iterate through the snps related to the sample
                for chromPos in vcfObj[samp]:
                    # Also iterate through each of the alleles
                    for allele in vcfObj[samp][chromPos]:
                        # Then compare to the data in each row of the study
                        for row in studyEntry['rows']:
                            if allele != None:
                                # Compare the individual's snp and allele to the study row's snp and risk allele
                                if chromPos == row['pos'] and allele == row['riskAllele']:
                                    oddRatios.append(row['oddsRatio'])
                                    chromPosList.append(row['pos'])
                                    if row['snp'] is not None:
                                        rsids.append(row['snp'])
                            else:
                                if chromPos == row['pos']:
                                    oddRatios.append(row['oddsRatio'])
                                    chromPosList.append(row['pos'])
                                    if row['snp'] is not None:
                                        rsids.append(row['snp'])
                studyResults.update({
                    "study": studyEntry['study'],
                    "oddsRatio": getCombinedORFromArray(oddRatios),
                    "percentile": "",
                    "numSNPsIncluded": len(oddRatios),
                    "chromPositionsIncluded": chromPosList,
                    "snpsIncluded": rsids
                })
                studies.append(studyResults)

            diseaseResults.update({
                "disease": diseaseEntry['disease'],
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
                chromPosinOR = ";".join(studyEntry['chromPositionsIncluded'])
                snpsinOR = ";".join(studyEntry['snpsIncluded'])
                line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + str(oddsRatio) + "," + \
                    str(percentile) + "," + str(numSNPsinOR) + \
                    "," + str(chromPosinOR) + "," + str(snpsinOR)
                finalText += "\n" + line
    finalText += '\n'
    return finalText

