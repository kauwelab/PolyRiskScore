import json
import math
import ast
import requests
import time
import datetime

def grepRes(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, fileType):
    if traits != "":
        traits = traits.split(" ")
    else:
        None
#    traits = traits.split(" ") if traits != "" else None
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None

    if (studyTypes is None and studyIDs is None and ethnicity is None):
        toReturn = getAllAssociations(pValue, refGen, fileType, traits)
    else:
        toReturn = getSpecificAssociations(pValue, refGen, fileType, traits, studyTypes, studyIDs, ethnicity)
    
    print('%'.join(toReturn))


def getAllAssociations(pValue, refGen, fileType, traits = ""): 
    if traits == "":
        traits = getAllTraits()
    associations = getAssociations("https://prs.byu.edu/all_associations", traits, pValue, refGen)
    return formatAssociationsForReturn(associations, fileType)


def getSpecificAssociations(pValue, refGen, fileType, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
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
    return formatAssociationsForReturn(associations, fileType)


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


def formatAssociationsForReturn(associations, fileType):
    snps = ""
    if fileType == "rsID":
        snps = "-e #ID "
    else:
        snps = "-e #CHROM "

    for disease in associations:
        for study in associations[disease]:
            for association in associations[disease][study]["associations"]:
                if fileType == "vcf" and association['pos'] != 'NA':
                    snps += "-e {0} ".format(association['pos'].split(":")[1])
                elif fileType == "rsID" and association['snp'] != 'NA':
                    snps += "-e {0} ".format(association['snp'])

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
