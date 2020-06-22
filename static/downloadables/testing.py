import requests
import json

def getAllAssociations(pValue, refGen, traits = None): 
    if (traits is None):
        url_t = "https://prs.byu.edu/get_traits"
        response = requests.get(url=url_t)
        response.close()
        traits = response.json()
    associations = {}
    url_a = "https://prs.byu.edu/all_associations"
    h=0
    for i in range(100, len(traits), 100):
        print("In for loop ")
        params = {
            "traits": traits[h:i],
            "pValue": pValue,
            "refGen": refGen
        }
        response = requests.get(url=url_a, params=params)
        response.close()
        if (response):
            associations = {**response.json(), **associations}
            h = i
        else:
            print(response.status_code)
            break
    else:
        print("Last ones")
        params = {
            "traits": traits[h:len(traits)],
            "pValue": pValue,
            "refGen": refGen
        }
        response = requests.get(url=url_a, params=params)
        response.close()
        associations = {**response.json(), **associations}
    
    snps = "-e #CHROM "
    print(associations)
    for disease in associations:
        for study in associations[disease]:
            print(study)
            for association in associations[disease][study]["associations"]:
                snps += "-e {0} ".format(association['snp'])
    
    associations = "[" + ', '.join(map(str, associations)) + "]"
    print(snps)
    return [snps, associations]

def getSpecificAssociations(pValue, refGen, traits = None, studyTypes = None, studyIDs = None, ethnicity = None):
    traitData = {}
    if (studyIDs is not None):
        # get the studies and traits associatioed with IDS
        pass
    

# getAllAssociations(0.0000000005, "hg38") #, ["Alzheimer's Disease", "acne"])


