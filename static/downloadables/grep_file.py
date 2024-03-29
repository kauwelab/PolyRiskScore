import zipfile
import tarfile
import gzip
import os.path
import json
from sys import argv
from io import TextIOWrapper

# filter the input vcf or txt file so that it only include SNPs that exist in the PRSKB database
def createFilteredFile(inputFilePath, fileHash, requiredParamsHash, superPop, refGen, defaultSex, p_cutOff, traits, studyTypes, studyIDs, ethnicities, extension, timestamp, useGWASupload):
    useGWASupload = True if useGWASupload == "True" or useGWASupload == True else False

    # tells us if we were passed rsIDs or a vcf
    isRSids = True if extension.lower().endswith(".txt") or inputFilePath.lower().endswith(".txt") else False
    
    # get the associations, clumps, study snps, and the paths to the filtered input file and the clump number file
    tableObjDict, clumpsObjDict, studySnpsDict, filteredInputPath, clumpNumPath = getFilesAndPaths(fileHash, requiredParamsHash, superPop, refGen, defaultSex, isRSids, timestamp, useGWASupload)

    # format the filters
    traits, studyTypes, studyIDs, ethnicities = formatVarForFiltering(traits, studyTypes, studyIDs, ethnicities)

    # Check to see if any filters were selected by the user
    isAllFiltersNone = (traits is None and studyIDs is None and studyTypes is None and ethnicities is None)

    # loop through each study/trait in the studySnpsDict and check whether any studies pass the filters
    studyInFilters = isStudyInFilters(studySnpsDict, tableObjDict, isAllFiltersNone, traits, studyIDs, studyTypes, ethnicities, p_cutOff)
    if not studyInFilters:
        raise SystemExit("WARNING: None of the studies in the database match the specified filters. Adjust your filters and try again.")

    # create a new filtered file that only includes associations in the user-specified studies
    if isRSids:
        clumpNumDict = filterTXT(tableObjDict, clumpsObjDict, inputFilePath, filteredInputPath, traits, studyIDs, studyTypes, ethnicities, isAllFiltersNone, p_cutOff) 
    else:
        clumpNumDict = filterVCF(tableObjDict, clumpsObjDict, inputFilePath, filteredInputPath, traits, studyIDs, studyTypes, ethnicities, isAllFiltersNone, p_cutOff)

    # write the clumpNumDict to a file for future use
    # the clumpNumDict is used to determine which variants aren't in LD with any of the other variants in the study
    # this allows us to skip some added checks in the parsing functions
    with open(clumpNumPath, 'w') as f:
        f.write(json.dumps(clumpNumDict))
    # remove clumpNumDict from memory
    clumpNumDict = {}

    return


def getFilesAndPaths(fileHash, requiredParamsHash, superPop, refGen, sex, isRSids, timestamp, useGWASupload):
    basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    # create path for filtered input file
    filteredInputPath = os.path.join(basePath, "filteredInput_{uniq}.txt".format(uniq = timestamp)) if isRSids else os.path.join(basePath, "filteredInput_{uniq}.vcf".format(uniq = timestamp))
    # create path for filtered associations
    specificAssociPath = os.path.join(basePath, "associations_{ahash}.txt".format(ahash = fileHash))
    # get the paths for the associationsFile , study snps, and clumpsFile
    if useGWASupload:
        associationsPath = os.path.join(basePath, "GWASassociations_{bhash}.txt".format(bhash = fileHash))
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps_{ahash}.txt".format(ahash=fileHash))
        # create path for clump number dictionary
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}_{ahash}.txt".format(r=refGen, ahash = fileHash))
    elif (fileHash == requiredParamsHash or not os.path.isfile(specificAssociPath)):
        associFileName = "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=sex[0]) if sex[0] != "e" else "allAssociations_{refGen}.txt".format(refGen=refGen)
        associationsPath = os.path.join(basePath, associFileName)
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}.txt".format(p = superPop, r = refGen))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps.txt")
        # create path for clump number dictionary
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}.txt".format(r=refGen))
    else:
        associationsPath = specificAssociPath
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash))
        studySnpsPath = os.path.join(basePath, "traitStudyIDToSnps_{ahash}.txt".format(ahash=fileHash))
        # create path for clump number dictionary
        clumpNumPath = os.path.join(basePath, "clumpNumDict_{r}_{ahash}.txt".format(r=refGen, ahash = fileHash))
    try:
	# write the files
        with open(associationsPath, 'r') as tableObjFile:
            tableObjDict = json.load(tableObjFile)
        with open(clumpsPath, 'r') as clumpsObjFile:
            clumpsObjDict = json.load(clumpsObjFile)
        with open(studySnpsPath, 'r') as studySnpsFile:
            studySnpsDict = json.load(studySnpsFile)
        tableObjFile = {}
        clumpsObjFile = {}
        studySnpsFile = {}
    except FileNotFoundError: 
        raise SystemExit("ERROR: One or both of the required working files could not be found. \n Paths searched for: \n{0}\n{1}\n{2}".format(associationsPath, clumpsPath, studySnpsPath))

    return tableObjDict, clumpsObjDict, studySnpsDict, filteredInputPath, clumpNumPath


def formatVarForFiltering(traits, studyTypes, studyIDs, ethnicities):
    # Format variables used for filtering
    traits = traits.lower()
    traits = traits.split(" ") if traits != "" else None
    if traits is not None:
        for i in range(len(traits)):
            trait = traits[i].replace('_', ' ').replace("\\'", "\'")
            traits[i] = trait

    studyTypes = studyTypes.upper()
    studyTypes = studyTypes.split(" ") if studyTypes != "" else None

    studyIDs = studyIDs.upper()
    studyIDs = studyIDs.split(" ") if studyIDs != "" else None

    ethnicities = ethnicities.lower()
    ethnicities = ethnicities.split(" ") if ethnicities != "" else None
    if ethnicities is not None:
        ethnicities = [sub.replace("_", " ") for sub in ethnicities]

    return traits, studyTypes, studyIDs, ethnicities


def filterTXT(tableObjDict, clumpsObjDict, inputFilePath, filteredFilePath, traits, studyIDs, studyTypes, ethnicities, isAllFiltersNone, p_cutOff):
    txt_file = openFileForParsing(inputFilePath)
    filteredOutput = open(filteredFilePath, 'w')

    # Create a boolean to keep track of whether any variants in the input VCF match the user-specified filters
    inputInFilters = False

    # Create a boolean to check whether the input VCF is empty
    fileEmpty = True

    # create a set to keep track of which ld clump numbers are assigned to only a single snp
    clumpNumDict = {}

    for line in txt_file:
        # remove all whitespace from line
        nw_line = "".join(line.split())

        # intialize variables
        snp = ""
        alleles = []

        try:
            # if the line isn't empty or commented out
            if nw_line != "" and not nw_line.startswith("#") and not nw_line.startswith("//"):
                # a record exists, so the file was not empty
                fileEmpty = False
                strippedLine = nw_line.strip() # line should be in format of rsID:Genotype, Genotype
                snp, alleles = strippedLine.split(':')
                allele1, allele2 = alleles.split(',')
                alleles = [allele1.upper(), allele2.upper()]
            else:
                continue
        except ValueError:
            raise SystemExit("ERROR: Some lines in the input file are not formatted correctly. " +
                    "Please ensure that all lines are formatted correctly (rsID:Genotype,Genotype)\n" +
                    "Offending line:\n" + line)

        snpInFilters = isSnpInFilters(snp, None, tableObjDict, isAllFiltersNone, traits, studyIDs, studyTypes, ethnicities, p_cutOff)
        if snpInFilters:
            # We use the clumpNumDict later in the parse_files functions to determine which variants are in an LD clump by themselves
            # if the snp is part of an ld clump that has already been noted, increase the count of the ld clump this snp is in
            if snp in clumpsObjDict:
                clumpNum = clumpsObjDict[snp]['clumpNum']
                clumpNumDict[clumpNum] = clumpNumDict.get(clumpNum, 0) + 1
            # write the line to the filtered txt file
            filteredOutput.write(line)
            inputInFilters = True
        
    if fileEmpty:
        raise SystemExit("The VCF file is either empty or formatted incorrectly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position")
    if not inputInFilters:
        raise SystemExit("WARNING: None of the variants available in the input file match the variants given by the specified study filters. Check your input file and your filters and try again.")

    filteredOutput.close()
    return clumpNumDict


def filterVCF(tableObjDict, clumpsObjDict, inputFilePath, filteredFilePath, traits, studyIDs, studyTypes, ethnicities, isAllFiltersNone, p_cutOff):
    # open the input file path for opening
    inputVCF = openFileForParsing(inputFilePath)

    with open(filteredFilePath, 'w') as w:
        # create a set to keep track of which ld clump numbers are assigned to only a single snp
        clumpNumDict = {}

        # Create a boolean to check whether the input VCF is empty
        fileEmpty = True

        # Create a boolean to keep track of whether any variants in the input VCF match the user-specified filters
        inputInFilters = False

        try:
            for line in inputVCF:
                # cut the line so that we don't use memory to tab split a huge file
                shortLine = line[0:500]
                if shortLine[0] == '#':
                    w.write(line)
                else:
                    cols = shortLine.split('\t')
                    # get the rsid and chrompos
                    rsID = cols[2]
                    chromPos = str(cols[0]) + ':' + str(cols[1])
                    # a record exists, so the file was not empty
                    fileEmpty = False
                    if (chromPos in tableObjDict['associations'] and (rsID is None or rsID not in tableObjDict['associations'])):
                        rsID = tableObjDict['associations'][chromPos]
                    # check if the snp is in the filtered studies
                    snpInFilters = isSnpInFilters(rsID, chromPos, tableObjDict, isAllFiltersNone, traits, studyIDs, studyTypes, ethnicities, p_cutOff)
                    if snpInFilters:
                        # increase count of the ld clump this snp is in
                        # We use the clumpNumDict later in the parsing functions to determine which variants are not in LD with any of the other variants
                        if rsID in clumpsObjDict:
                            clumpNum = clumpsObjDict[rsID]['clumpNum']
                            clumpNumDict[clumpNum] = clumpNumDict.get(clumpNum, 0) + 1

                        # write the line to the filtered VCF
                        w.write(line)
                        inputInFilters = True

            if fileEmpty:
                raise SystemExit("The VCF file is either empty or formatted incorrectly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position")
            # send error message if input not in filters
            if not inputInFilters:
                raise SystemExit("WARNING: None of the variants available in the input file match the variants given by the specified filters. Check your input file and your filters and try again.")
        except ValueError:
            raise SystemExit("THE VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")


    return clumpNumDict


def isStudyInFilters(studySnpsDict, tableObjDict, isAllFiltersNone, traits, studyIDs, studyTypes, ethnicities, p_cutOff):
    studyInFilters = False
    useTrait = False
    useStudy = False
    # Loop through each trait/study
    for keyString in studySnpsDict:
        trait = keyString.split('|')[0]
        study = keyString.split('|')[1]
        
        # if there are traits to filter by and the trait for this snp is in the list, use this trait
        if traits is not None and trait.lower() in traits:
            useTrait = True

        # if there were filters specified for the studies, check if this study should be used
        if not isAllFiltersNone:
            studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
            useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
        if useStudy or isAllFiltersNone:
            studyInFilters = True
            return studyInFilters

    return studyInFilters


def isSnpInFilters(rsID, chromPos, tableObjDict, isAllFiltersNone, traits, studyIDs, studyTypes, ethnicities, p_cutOff):
    snpInFilters = False
    # if the position is found in our database
    if rsID in tableObjDict['associations']:
        # Loop through each trait for the position
        for trait in tableObjDict['associations'][rsID]['traits'].keys():
            useTrait = False
            useStudy = False
            # if there are traits to filter by and the trait for this snp is in the list, use this trait
            if traits is not None and trait.lower() in traits:
                useTrait = True
            # Loop through each study containing the position
            for study in tableObjDict['associations'][rsID]['traits'][trait].keys():
                # if we aren't going to use all the associations, decide if this is one that we will use
                # check if the pValue is less than the given threshold
                pValue = tableObjDict['associations'][rsID]['traits'][trait][study]['pValue']
                if pValue <= float(p_cutOff):
                    # if there were filters specified for the studies, check if this study should be used
                    if not isAllFiltersNone:
                        studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                        useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
                    if useStudy or isAllFiltersNone:
                        snpInFilters = True
                        return snpInFilters

    return snpInFilters


# opens and returns an open file from the inputFile path, using zipfile, tarfile, gzip, or open depending on the file's type
# assumes the file is valid (validated with getZippedFileExtension function)
def openFileForParsing(inputFile, isGWAS=False):
    filename = ""
    if zipfile.is_zipfile(inputFile):
        # open the file
        archive = zipfile.ZipFile(inputFile)
        # get the vcf or txt file in the zip
        for filename in archive.namelist():
            extension = filename[-4:].lower()
            if (not isGWAS and extension == ".txt" or extension == ".vcf") or (isGWAS and extension == ".txt" or extension == ".tsv"):
                # TextIOWrapper converts bytes to strings and force_zip64 is for files potentially larger than 2GB
                return TextIOWrapper(archive.open(filename, force_zip64=True))
    elif tarfile.is_tarfile(inputFile):
        # open the file
        archive = tarfile.open(inputFile)
        # get the vcf or txt file in the tar
        for tarInfo in archive:
            extension = tarInfo.name[-4:].lower()
            if (not isGWAS and extension == ".txt" or extension == ".vcf") or (isGWAS and extension == ".txt" or extension == ".tsv"):
                # TextIOWrapper converts bytes to strings
                return TextIOWrapper(archive.extractfile(tarInfo))
    elif inputFile.lower().endswith(".gz") or inputFile.lower().endswith(".gzip"):
        return TextIOWrapper(gzip.open(inputFile, 'r'))
    else:
        # default option for regular vcf and txt files
        return open(inputFile, 'r')


def shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait):
    useStudyID = False
    useReportedTrait = False
    useEthnicity = False
    useStudyType = False

    # if the studyID matches one that was selected, use it
    if studyIDs is not None and studyID in studyIDs:
        useStudyID = True

    if studyIDs is not None and traits is None and ethnicities is None and studyTypes is None:
        return useStudyID

    # set use trait to True if we aren't specificallly filtering by it
    if traits is None:
        useTrait = True
    # if the reportedTrait for the study is in the traits list for filtering, useReportedTrait is true
    if traits is None or (traits is not None and studyMetaData is not None and studyMetaData['reportedTrait'].lower() in traits):
        useReportedTrait = True
    if studyMetaData is not None and studyMetaData['ethnicity'] is not None: #TODO should probably come up with a better way to handle a situation like this, we need to decide what we will do when the study doens't have an ethnicity attached to it (maybe give it 'other' on the server?)
        ethnicitiesLower = set([x.lower() for x in studyMetaData['ethnicity']])
        # if the ethnicities have overlap, set useEthnicity to true
        if (useTrait or useReportedTrait) and ethnicities is None or (ethnicities is not None and (len(set(ethnicities).intersection(ethnicitiesLower)) > 0)):
            useEthnicity = True
    # if we have studyTypes that match the filter, set useStudyType to true
    if (((useTrait and studyTypes is None) or (useTrait and studyTypes is not None and len(set(studyTypes).intersection(set(studyMetaData['traits'][trait]))) > 0)) or 
            ((useReportedTrait and studyTypes is None) or (useReportedTrait and studyTypes is not None and len(set(studyTypes).intersection(set(studyMetaData['studyTypes']))) > 0))):
        useStudyType = True
    # we either want to use this study because of the studyID or because filtering trait, ethnicity, and studyTypes give us this study
    return useStudyID or (useEthnicity and useStudyType)


# checks if the file is a vaild zipped file and returns the extension of the file inside the zipped file
# a zipped file is valid if it is a zip, tar, or gz file with only 1 vcf/txt file inside
# returns and prints: ".vcf" or "txt" if the zipped file is valid and contains one of those files
                    # "False" if the file is not a zipped file
                    # error message if the file is a zipped file, but is not vaild
def getZippedFileExtension(filePath, shouldPrint, isGWAS):
    isGWAS = False if (isGWAS == "False" or isGWAS == False) else True

    # if the file is a zip file
    if zipfile.is_zipfile(filePath):
        # open the file
        archive = zipfile.ZipFile(filePath, "r")
        # get the number of vcf/txt files inside the file
        validArchive = []
        for filename in archive.namelist():
            if (not isGWAS and filename[-4:].lower() == ".vcf" or filename[-4:].lower() == ".txt") or (isGWAS and filename[-4:].lower() == ".tsv" or filename[-4:].lower() == ".txt"):
                validArchive.append(filename)
        # if the number of vcf/txt files is one, this file is valid and the extension is printed and returned
        if len(validArchive) == 1:
            new_file = validArchive[0]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "There must be 1 vcf/txt file in the zip file. Please check the input file and try again."
            if isGWAS:
                msg = "There must be 1 tsv/txt file in the GWAS zip file. Please check the input file and try again."
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is a tar-like file (tar, tgz, tar.gz, etc.)
    elif tarfile.is_tarfile(filePath):
        # open the file
        archive = tarfile.open(filePath)
        # get the number of vcf/txt files inside the file
        validArchive = []
        for tarInfo in archive.getmembers():
            if (not isGWAS and tarInfo.name[-4:].lower() == ".vcf" or tarInfo.name[-4:].lower() == ".txt") or (isGWAS and tarInfo.name[-4:].lower() == ".tsv" or tarInfo.name[-4:].lower() == ".txt"):
                validArchive.append(tarInfo.name)
        # if the number of vcf/txt files is one, this file is valid and the extension is printed and returned
        if len(validArchive) == 1:
            new_file = validArchive[0]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "There must be 1 vcf/txt file in the tar file. Please check the input file and try again."
            if isGWAS:
                msg = "There must be 1 tsv/txt file in the GWAS tar file. Please check the input file and try again."
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is a gz file (checked last to not trigger for tar.gz)
    elif filePath.lower().endswith(".gz"):
        # if the gz file is a vcf/txt file, print and return the extension
        if (not isGWAS and filePath.lower().endswith(".txt.gz") or filePath.lower().endswith(".vcf.gz")) or (isGWAS and filePath.lower().endswith(".txt.gz") or filePath.lower().endswith(".tsv.gz")):
            new_file = filePath[:-3]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "The gzipped file is not a txt or vcf file. Please check the input file and try again"
            if isGWAS:
                msg = "The gzipped GWAS file is not a txt or tsv file. Please check the input file and try again"
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is not a zip, tar, or gz, print and return "False"
    else:
        printIfShould(shouldPrint, "False")
        return "False"


# prints msg if should is True
def printIfShould(should, msg):
    if should:
        print(msg)


if __name__ == "__main__":
    if (argv[1]) == "zip":
        getZippedFileExtension(argv[2], argv[3], argv[4])
    else:
        createFilteredFile(argv[1], argv[2], argv[3], argv[4], argv[5], argv[6], argv[7], argv[8], argv[9], argv[10], argv[11], argv[12], argv[13], argv[14])

