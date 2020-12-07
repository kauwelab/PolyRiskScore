import json
import math
import ast
import requests
import os
import os.path
import time
import datetime
from multiprocessing import Process

# get the associations and clumps from the Server
def retrieveAssociationsAndClumps(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, superPop, fileHash, extension):
    checkInternetConnection()

    # Format variables used for getting associations
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        traits = [sub.replace('_', ' ') for sub in traits]
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None
    ethnicity = ethnicity.split(" ") if ethnicity != "" else None
    isVCF = True if extension.lower() == ".vcf" else False
    
    # TODO still need to test this - can't be done until the new server is live with the new api code
    dnldNewAllAssociFile = checkForAllAssociFile()
    
    workingFilesPath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    associationsPath = ""
    # if the user didn't give anything to filter by, get all the associations
    if (traits is None and studyTypes is None and studyIDs is None and ethnicity is None):
        # if we need to download a new all associations file, write to file
        associationsPath = os.path.join(workingFilesPath, "allAssociations.txt")
        if (dnldNewAllAssociFile):
            associations = getAllAssociations(pValue, refGen, isVCF)
            strandFlip = True
        else:
            f = open(associationsPath, 'r')
            associations = json.loads(f.read())
            f.close()
            strandFlip = False
    # else get the associations using the given filters
    else:
        fileName = "associations_{ahash}.txt".format(ahash = fileHash)
        associationsPath = os.path.join(workingFilesPath, fileName)
        associations = getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, isVCF)
        strandFlip = True

    # grab all the snps or positions to use for getting the clumps
    snpsFromAssociations = list(associations.keys())
    # flip strands as needed
    if (strandFlip):
        p = Process(target=handleStrandFlippingAndSave, args=(associations, associationsPath))
        p.start()

    #download clumps
    fileName = "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash)
    clumpsPath = os.path.join(workingFilesPath, fileName)
    # get clumps using the refGen and superpopulation
    clumpsData = getClumps(refGen, superPop, snpsFromAssociations, isVCF)
    f = open(clumpsPath, 'w')
    f.write(json.dumps(clumpsData))
    f.close()

    if (strandFlip):
        print("finishing strand flipping")
        p.join()


def checkForAllAssociFile():
    # assume we will need to download new files
    dnldNewAllAssociFile = True
    # check to see if the workingFiles directory is there, if not make the directory
    scriptPath = os.path.dirname(os.path.abspath(__file__))
    workingFilesPath = os.path.join(scriptPath, ".workingFiles")

    # if the directory doesn't exist, make it, and we will need to download the files
    if not os.path.exists(workingFilesPath):
        os.mkdir(workingFilesPath) # need a better name for this?
        return dnldNewAllAssociFile
    
    else:
        # get date the database was last updated
        response = requests.get(url="https://prs.byu.edu/last_database_update")
        response.close()
        assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
        lastDatabaseUpdate = response.text
        lastDatabaseUpdate = lastDatabaseUpdate.split("-")
        lastDBUpdateDate = datetime.date(int(lastDatabaseUpdate[0]), int(lastDatabaseUpdate[1]), int(lastDatabaseUpdate[2]))

        # path to a file containing all the associations from the database
        allAssociationsFile = os.path.join(workingFilesPath, "allAssociations.txt")

        # if the path exists, check if we don't need to download a new one
        if os.path.exists(allAssociationsFile):
            fileModDateObj = time.localtime(os.path.getmtime(allAssociationsFile))
            fileModDate = datetime.date(fileModDateObj.tm_year, fileModDateObj.tm_mon, fileModDateObj.tm_mday)
            # if the file is newer than the database update, we don't need to download a new file
            if (lastDBUpdateDate < fileModDate):
                dnldNewAllAssociFile = False
        
        return dnldNewAllAssociFile


# gets all associations from the Server
def getAllAssociations(pValue, refGen, isVCF): 
    params = {
        "pValue": pValue,
        "refGen": refGen,
        "isVCF": isVCF
    }
    associations = getUrlWithParams("https://prs.byu.edu/all_associations", params = params)
    # Organized with pos/snp as the Keys
    return associations


# gets associations using the given filters
def getSpecificAssociations(pValue, refGen, traits, studyTypes, studyIDs, ethnicity, isVCF):

    finalStudySet = set()
    if (studyIDs is None and (traits is not None or studyTypes is not None or ethnicity is not None)):
        # get the studies matching the parameters
        body = {
            "traits": traits, 
            "studyTypes": studyTypes,
            "ethnicities": ethnicity,
        }
        traitData = {**postUrlWithBody("https://prs.byu.edu/get_studies", body=body)}

        # select the studyIDs of the studies
        for trait in traitData:
            for study in traitData[trait]:
                finalStudySet.add(study["studyID"])

    # add the specified studyIDs to the set of studyIDs
    if studyIDs is not None:
        studyIDs = set(studyIDs)
        finalStudySet = finalStudySet.union(studyIDs)

    # get the associations based on the studyIDs
    body = {
        "pValue": pValue,
        "refGen": refGen,
        "studyIDs": list(finalStudySet),
        "isVCF": isVCF
    }

    associations = postUrlWithBody("https://prs.byu.edu/get_associations", body=body)
    return associations


# for POST urls
def postUrlWithBody(url, body):
    response = requests.post(url=url, data=body)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json() 


# for GET urls
def getUrlWithParams(url, params):
    response = requests.get(url=url, params=params)
    response.close()
    assert (response), "Error connecting to the server: {0} - {1}".format(response.status_code, response.reason) 
    return response.json()  


# get clumps using the refGen and superPop
def getClumps(refGen, superPop, snpsFromAssociations, isVCF):
    body = {
        "refGen": refGen,
        "superPop": superPop,
    }
    print("Retrieving clumping information")

    try:
        if isVCF:
            chromToPosMap = {}
            clumps = {}
            for pos in snpsFromAssociations:
                if (len(pos.split(":")) > 1):
                    chrom,posit = pos.split(":")
                    if (chrom not in chromToPosMap.keys()):
                        chromToPosMap[chrom] = [pos]
                    else:
                        chromToPosMap[chrom].append(pos)

            print("Clumps downloaded by chromosome:")
            for chrom in chromToPosMap:
                print("{0}...".format(chrom), end="", flush=True)
                body['positions'] = chromToPosMap[chrom]
                clumps = {**postUrlWithBody("https://prs.byu.edu/ld_clumping_by_pos", body), **clumps}
            print('\n')
        else:
            body['snps'] = snpsFromAssociations
            clumps = postUrlWithBody("https://prs.byu.edu/ld_clumping_by_snp", body)
    except AssertionError:
        raise SystemExit("ERROR: 504 - Connection to the server timed out")

    return clumps


def handleStrandFlippingAndSave(associations, filePath):
    import myvariant
    import contextlib, io

    # print("Performing strand flipping where needed. Please be patient as we download the needed data")

    f = io.StringIO()
    with contextlib.redirect_stdout(f):
        rsIDs = (x for x in associations.keys() if "rs" in x)
        mv = myvariant.MyVariantInfo()
        queryResultsObj = mv.querymany(rsIDs, scopes='dbsnp.rsid', fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref', returnall=True)
    output = f.getvalue()

    # print("Data downloaded")

    rsIDToAlleles = []

    for obj in queryResultsObj['out']:
        rsID = obj['query']
        if (rsID not in rsIDToAlleles and 'dbsnp' in obj):
            alleles = set()
            if ('alleles' in obj['dbsnp']):
                for alleleObj in obj['dbsnp']['alleles']:
                    alleles.add(alleleObj['allele'])
            if ('ref' in obj['dbsnp'] and obj['dbsnp']['ref'] != ""):
                alleles.add(obj['dbsnp']['ref'])
            if ('alt' in obj['dbsnp'] and obj['dbsnp']['alt'] != ""):
                alleles.add(obj['dbsnp']['alt'])
            if (len(alleles) == 0):
                print(obj, "STILL NO ALLELES")
            
            if (rsID in associations):
                for studyID in associations[rsID]['studies']:
                    riskAllele = associations[rsID]['studies'][studyID]['riskAllele']
                    # if the current risk allele seems like it isn't correct and the length of the risk allele is only one base
                    if riskAllele not in alleles and len(riskAllele) == 1:
                        complement = getComplement(riskAllele)
                        if complement in alleles:
                            associations[rsID]['studies'][studyID]['riskAllele'] = complement

            rsIDToAlleles.append(rsID)

            #TODO: what to do if we have merged rsIDs? 
            # we could add the rsID of what the old one merged into
            # queryResultsObj = mv.querymany(queryResultsObj['missing'], scopes='dbsnp.dbsnp_merges.rsid', fields='dbsnp.alleles.allele, dbsnp.dbsnp_merges, dbsnp.gene.strand, dbsnp.alt, dbsnp.ref', returnall=True)

            #loop through the ones we couldn't find
            #see if we can get them from a dbsnp.dbsnp_merges.rsid
    f = open(filePath, 'w')
    f.write(json.dumps(associations))
    f.close()
    return 


def getComplement(allele):
    complements = {
        'G': 'C',
        'C': 'G',
        'A': 'T',
        'T': 'A'
    }
    return(complements[allele])


def checkInternetConnection():
    import socket
    IPaddress=socket.gethostbyname(socket.gethostname())
    if IPaddress=="127.0.0.1":
        raise SystemExit("ERROR: No internet - Check your connection")
    else:
        return
