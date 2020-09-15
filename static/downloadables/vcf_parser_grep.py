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
    if traits == "":
        traits = getAllTraits()
    associations = getAssociations("https://prs.byu.edu/all_associations", traits, pValue, refGen)
    return formatAssociationsForReturn(associations)


def getSpecificAssociations(pValue, refGen, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
    studyIDspecificData = {}

    if (studyIDs is not None):
        url_get_by_study_id = "https://prs.byu.edu/get_studies"
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
    params = {
    "studyIDs":studyIDs,
    "superPop":superPop
    }
    res = urlWithParams("https://prs.byu.edu/ld_clumping", params)
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
    # Create a defautlt dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Access the snp clumps from the database
    clumps = getClumps(studyIDs, superPop)
    clumpMap = defaultdict(dict)

    output2 = open('output2.txt', 'w')
    for study in clumps:
        for snpObj in clumps[study]:
            hg38_pos = snpObj['hg38_pos']
            clumpNum = snpObj['clumpNumber']
            clumpMap[study][hg38_pos] = clumpNum
    output2.write("clump map:\n")
    output2.write(str(clumpMap))
    output2.write('\n\n\n')
    # Iterate through each record in the file and save the SNP rs ID
    for record in vcf_reader:
        output2.write('\nin vcf reader loop\n')
        snp = record.ID
        chrom = record.CHROM
        pos = record.POS
        if refGen != 'hg38':
            chromPos = convertRefGen(chrom, pos, lo)
            output2.write("chromPos:\n")
            output2.write(str(chromPos))
            output2.write('\n')
        else:
            chromPos = str(record.CHROM) + ":" + str(record.POS)
        for disease_study in diseaseStudyIDs:
            output2.write("disease_study:\n")
            output2.write(str(disease_study))
            disease, study = disease_study
            output2.write("the chromPoses for this study in the clumpMap:\n")
            output2.write(str(clumpMap[study]))
            output2.write('\n')
            if chromPos in clumpMap[study]:
                output2.write("THE CHROMPOS IS IN THE CLUMP MAP\n") 
                clumpNum = clumpMap[study][chromPos] 
                # Look up the pvalue from hte map that was given as a parameter to this function
                if chromPos in pos_pval_map[study]:
                    output2.write("\nTHE CHROMPOS IS ALSO IN THE TABLE OBJECT\n")
                    pValue = pos_pval_map[study][chromPos]
                    totalLines += 1
                # if snp:  # If the SNP rs ID exists, move forward
                    output2.write('\n')
                    output2.write(str(record.samples))
                    output2.write('\n')
                    for call in record.samples:  # Iterate through each of the samples for the record
                        gt = call.gt_bases     # Save the genotype bases
                        name = call.sample     # Save the name of the sample
                        # Create a list of the genotype alleles
                        output2.write('\n')
                        output2.write(name)
                        output2.write('\n')
                        disease_study_name = (disease, study, name)
                        if gt is not None:
                            output2.write('\ngt is not None\n')
                            if "|" in gt:
                                alleles = gt.split('|')
                            elif "/" in gt:
                                alleles = gt.split('/')
                            else:
                                alleles = list(gt)
                        # Add to the nested map so that the outer key = sample name; value = inner map--where key = SNP ID and value = allele list
                            output2.write('disease study name:\n')
                            output2.write(str(disease_study_name))
                            output2.write('\n')
                            if disease_study_name in index_snp_map:
                                output2.write("the disease/study/name is already in the index snp map\n")
                                if clumpNum in index_snp_map[disease_study_name]:
                                    output2.write("the clump number is already used for this disease/study/name combo\n")
                                    output2.write("the clump number is: ")
                                    output2.write(str(clumpNum))
                                    output2.write("\nthe current index snp is: ")
                                    index_snp = index_snp_map[disease_study_name][clumpNum]
                                    output2.write(index_snp)
                                    output2.write("\nthe current index pvalue is: ")
                                    index_pvalue = pos_pval_map[study][index_snp]
                                    output2.write(str(index_pvalue))
                                    output2.write('\n')
                                    if pValue < index_pvalue:
                                        matchedSNPs += 1
                                        output2.write("the pvalue is less than the index pvalue: ")
                                        output2.write(str(pValue))
                                        output2.write('\n')
                                        output2.write("the index snp map for this disease/study/name and clump num looks like this: ")
                                        output2.write(str(index_snp_map[disease_study_name][clumpNum]))
                                        del index_snp_map[disease_study_name][clumpNum]
                                        index_snp_map[disease_study_name][clumpNum] = chromPos
                                        del sample_map[disease_study_name][index_snp]
                                        sample_map[disease_study_name][chromPos] = alleles
                                else:
                                    matchedSNPs += 1
                                    output2.write("the clump number isn't used already by this combo\n")
                                    index_snp_map[disease_study_name][clumpNum] = chromPos
                                    sample_map[disease_study_name][chromPos] = alleles
                            else:
                                matchedSNPs += 1
                                output2.write("the disease/study/name isn't alrady in the index snp map\n")
                                index_snp_map[disease_study_name][clumpNum] = chromPos
                                sample_map[disease_study_name][chromPos] = alleles
                        else:
                            sample_map[disease_study_name][chromPos] = ""
            if matchedSNPs == 0:
                output2.write("\nmatchedsnps is zero\n")
                for name in vcf_reader.samples:
                    disease_study_name = (disease, study, name)
                    sample_map[disease_study_name][""] = ""
    output2.write("\nfinal map:")
    final_map = dict(sample_map)
    output2.write('\n')
    output2.write(str(final_map))
    output2.close()
    return final_map, totalLines


def calculations(tableObjList, vcfObj, totalVariants, pValue, refGen, lo, outputType):
    output3 = open('output3.txt', 'w')
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
                    output3.write("in new table object row\n")
                    chrom = row['pos'].split(':')[0]
                    pos = row['pos'].split(':')[1]
                    if refGen != 'hg38':
                        hg38_pos = convertRefGen(chrom, pos, lo)
                    else:
                        hg38_pos = str(chrom) + ':' + str(pos)
                    output3.write("hg38 pos: ")
                    output3.write(hg38_pos)
                    output3.write('\n')
                    if allele != None:
                        # Compare the individual's snp and allele to the study row's snp and risk allele
                        if chromPos == hg38_pos and allele == row['riskAllele']:
                            output3.write("hg38 pos andn allele match\n")
                            oddRatios.append(row['oddsRatio'])
                            chromPosList.append(row['pos'])
                            output3.write("the oddratios are now:\n")
                            output3.write(str(oddRatios))
                            output3.write("\nthe chromPoses are now:\n")
                            output3.write(str(chromPosList))
                            output3.write('\n')
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
                line = str(name) + "," + str(diseaseName) + "," + str(study) + "," + str(oddsRatio) + "," + \
                    str(percentile) + "," + str(numSNPsinOR) + \
                    "," + str(chromPosinOR) + "," + str(snpsinOR)
                finalText += "\n" + line
    finalText += '\n'
    return finalText

