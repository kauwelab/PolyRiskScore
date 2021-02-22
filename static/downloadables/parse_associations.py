# import calculate_score as cs
import time
import sys
import os
import os.path

# $1=inputFile $2=pValue $3=outputType $4=refGen $5=superPop $6=outputFile 
# $7=isCondensedFormat $8=fileHash $9=requiredParamsHash, $10=defaultSex, 
# $11=traits, $12=studyTypes, $13=studyIDs, $14=ethnicities



# cs.calculateScore(sys.argv[1], sys.argv[2], sys.argv[3], tableObjList, clumpsObjList, sys.argv[4], isCondensedFormat, isJson, sys.argv[6], sys.argv[11], sys.argv[12], sys.argv[13], sys.argv[14])

# if sys.argv[3] == '.json':
#     isJson = True
#     isCondensedFormat = False
# else:
#     isJson = False
#     if sys.argv[7] == '0':
#         isCondensedFormat = False
#     else:
#         isCondensedFormat = True

def collectValidAssociations(inputFile, pValue, refGen, superPop, fileHash, requiredParamsHash, defaultSex, traits, studyTypes, studyIDs, ethnicities):
    tableObjDict, clumpsObjDict = createAssociationsAndClumpsDicts(fileHash, requiredParamsHash, superPop, refGen, defaultSex)
    traits, studyTypes, studyIDs, ethnicities = formatVarForFiltering(traits, studyTypes, studyIDs, ethnicities)

    # tells us if we were passed rsIDs or a vcf
    extension = getZippedFileExtension(inputFile, False)
    isRSids = True if extension.lower().endswith(".txt") or inputFile.lower().endswith(".txt") else False

    if isRSids:
        txtObj, neutral_snps_map, clumped_snps_map, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs = parse_txt(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)
    else:
        vcfObj, neutral_snps_map, clumped_snps_map, samp_num, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs = parse_vcf(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, pValue)


def createAssociationsAndClumpsDicts(fileHash, requiredParamsHash, superPop, refGen, sex):
    basePath = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".workingFiles")
    specificAssociPath = os.path.join(basePath, "associations_{ahash}.txt".format(ahash = fileHash))
    # get the paths for the associationsFile and clumpsFile
    if (fileHash == requiredParamsHash or not os.path.isfile(specificAssociPath)):
        associationsPath = os.path.join(basePath, "allAssociations_{refGen}_{sex}.txt".format(refGen=refGen, sex=sex[0]))
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}.txt".format(p = superPop, r = refGen))
    else:
        associationsPath = specificAssociPath
        clumpsPath = os.path.join(basePath, "{p}_clumps_{r}_{ahash}.txt".format(p = superPop, r = refGen, ahash = fileHash))

    try:
        with open(associationsPath, 'r') as tableObjFile:
            tableObjList = tableObjFile.read()
        with open(clumpsPath, 'r') as clumpsObjFile:
            clumpsObjList = clumpsObjFile.read()
    except FileNotFoundError: 
        raise SystemExit("ERROR: One or both of the required working files could not be found. \n Paths searched for: \n{0}\n{1}".format(associationsPath, clumpsPath))

    tableObjDict = json.loads(tableObjList)
    clumpsObjDict = json.loads(clumpsObjList)

    return tableObjDict, clumpsObjDict


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


# determines if we should use this association based on the filters given
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


# returns an open file (for txt files) or a vcf.Reader (for vcf files)
# if the file is zipped (zip, tar, tgz, gz, etc), reads the file without unzipping it
# assumes the file is already validated
def openFileForParsing(inputFile, isTxtExtension):
    # if the file is zipped
    if zipfile.is_zipfile(inputFile):
        # open the file
        archive = zipfile.ZipFile(inputFile)
        validArchive = []
        # get the vcf or txt file in the zip
        for filename in archive.namelist():
            if filename[-4:].lower() == ".vcf" or filename[-4:].lower() == ".txt":
                validArchive.append(filename)
        # decode the file from the zip file
        new_file = archive.read(validArchive[0]).decode().replace("\r", "").split("\n")
    # if the file is tar zipped
    elif tarfile.is_tarfile(inputFile):
        # open the file
        archive = tarfile.open(inputFile)
        # get the vcf or txt file in the tar
        for tarInfo in archive:
            if tarInfo.name[-4:].lower() == ".vcf" or tarInfo.name[-4:].lower() == ".txt":
                # wrap the ExFileObject in an io.TextIOWrapper and read
                new_file = io.TextIOWrapper(archive.extractfile(tarInfo)).read().replace("\r", "").split("\n")
    # if file is gzipped
    elif inputFile.lower().endswith(".gz") or inputFile.lower().endswith(".gzip"):
        new_file = gzip.open(inputFile, 'rt').read().replace("\r", "").split("\n")
    else:
        # default open for regular vcf and txt files
        new_file = open(inputFile, 'r').read().replace("\r", "").split("\n")
    
    # return the new file either as is (txt) or as a vcf.Reader (vcf)
    if isTxtExtension:
        return new_file
    else:
        # open the newly unzipped file using the vcf reader
        try:
            return vcf.Reader(new_file)
        except:
            # typically happens if the file is empty
            raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")


def formatAndReturnGenotype(genotype, REF, ALT):
    try:
        if genotype != "./." and genotype != ".|." and genotype !=".." and genotype != '.':
            count = 0
            alleles = []
            if "|" in genotype:
                gt_nums = genotype.split('|')
                if gt_nums[0] == ".":
                    count = 1
                elif gt_nums[1] == ".":
                    count = 2
                if count == 0:
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
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
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
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
                    if gt_nums[0] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[0]) - 1
                        alleles.append(ALT[gt_num])
                    if gt_nums[1] == '0':
                        alleles.append(REF)
                    else:
                        gt_num = int(gt_nums[1]) - 1
                        alleles.append(ALT[gt_num])
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

    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    return alleles


def parse_txt(txtFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, p_cutOff):
    Lines = openFileForParsing(txtFile, True)

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a set to keep track of which disease/study/samples have viable snps and which ones don't 
    counter_set = set()

    # Create a boolean to keep track of whether any studies pass the specified filters
    isNoStudies = True

    # keeps track of if any valid data is found in the file
    fileEmpty = True

    # True if at least one snp from the input file is in the filtered associations
    inputInFilters = False

    # Create a dictionary of studyIDs to neutral snps
    neutral_snps_map = {}
    clumped_snps_map = {}

    isAllFiltersNone = (traits is None and studyIDs is None and studyTypes is None and ethnicities is None)

    # Iterate through each record in the file and save the SNP rs ID
    for line in Lines:
        # remove all whitespace from line
        line = "".join(line.split())

        # initialize variables
        snp = ""
        alleles = []

        try:
            # if the line isn't empty or commented out
            if line != "" and not line.startswith("#") and not line.startswith("//"):
                line = line.strip() #line should be in format of rsID:Genotype,Genotype
                snp, alleles = line.split(':')
                allele1, allele2 = alleles.split(',')
                alleles = [allele1.upper(), allele2.upper()]
            else:
                continue
        except ValueError:
            raise SystemExit("ERROR: Some lines in the input file are not formatted correctly. " +
                "Please ensure that all lines are formatted correctly (rsID:Genotype,Genotype)\n" +
                "Offending line:\n" + line)
        
        if alleles != [] and snp != "":
            # a valid line exists, so the file was not empty
            fileEmpty = False
            # if the position is found in our database
            if snp in tableObjDict['associations']:
                # data from the input file was found in the filtered database
                inputInFilters = True
                # Loop through each trait for the position
                for trait in tableObjDict['associations'][snp]['traits'].keys():
                    # initializing variables
                    useTrait = False
                    useStudy = False
                    # if there are traits to filter by and the trait for this snp is in the list, use this trait 
                    if traits is not None and trait.lower() in traits:
                        useTrait = True
                    # Loop through each study containing the position
                    for studyID in tableObjDict['associations'][snp]['traits'][trait].keys():
                        # if we aren't going to use all the associations, decide if this is one that we will use
                        if not isAllFiltersNone:
                            studyMetaData = tableObjDict['studyIDsToMetaData'][studyID] if studyID in tableObjDict['studyIDsToMetaData'].keys() else None
                            useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait)
                        if isAllFiltersNone or useStudy:
                            isNoStudies = False
                            # grab pValue and riskAllele
                            pValue = tableObjDict['associations'][snp]['traits'][trait][studyID]['pValue']
                            riskAllele = tableObjDict['associations'][snp]['traits'][trait][studyID]['riskAllele']

                            # Check if the association's pvalue is more significant than the given threshold
                            if pValue <= float(p_cutOff):
                                trait_study = (trait, studyID)

                                # Grab or create sets
                                clumpedVariants = clumped_snps_map[trait_study] if trait_study in clumped_snps_map else set()
                                unmatchedAlleleVariants = neutral_snps_map[trait_study] if trait_study in neutral_snps_map else set()

                                if riskAllele in alleles:
                                    # add this trait/study to the counter set because there was a viable snp
                                    counter_set.add(trait_study)

                                    # Check to see if the snp position from this line in the file exists in the clump table
                                    if snp in clumpsObjDict:
                                        # Grab the clump number associated with this snp 
                                        clumpNum = clumpsObjDict[snp]['clumpNum']

                                        # Check if the studyID has been used in the index snp map yet
                                        # The index snp map keeps track of the snps that will represent each ld clump
                                        if trait_study in index_snp_map:
                                            # Check whether the existing index snp or current snp have a lower pvalue for this study
                                            # and switch out the data accordingly
                                            if clumpNum in index_snp_map[trait_study]:
                                                index_snp = index_snp_map[trait_study][clumpNum]
                                                index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][studyID]['pValue']

                                                if pValue < index_pvalue:
                                                    del index_snp_map[trait_study][clumpNum]
                                                    index_snp_map[trait_study][clumpNum] = snp
                                                    del sample_map[trait_study][index_snp]
                                                    sample_map[trait_study][snp] = alleles
                                                    # The snps that aren't index snps will be considered neutral snps
                                                    clumpedVariants.add(index_snp)
                                                else:
                                                    clumpedVariants.add(snp)
                                            else:
                                                # Since the clump number for this snp position and studyID
                                                # doesn't already exist, add it to the index map and the sample map
                                                index_snp_map[trait_study][clumpNum] = snp
                                                sample_map[trait_study][snp] = alleles
                                        else:
                                            # Since the trait_study wasn't already used in the index map, add it to both the index and sample map
                                            index_snp_map[trait_study][clumpNum] = snp
                                            sample_map[trait_study][snp] = alleles
                                    # The snp wasn't in the clump map (meaning it wasn't in 1000 Genomes), so add it
                                    else:
                                        sample_map[trait_study][snp] = alleles
                                        counter_set.add(trait_study)
                                else:
                                    unmatchedAlleleVariants.add(snp)

                                neutral_snps_map[trait_study] = unmatchedAlleleVariants
                                clumped_snps_map[trait_study] = clumpedVariants

    # contains the trait/study combos that don't have any matching snps in the input file
    unusedTraitStudyPairs = {}

    # if the file is empty, or formatted incorrectly
    if fileEmpty:
        raise SystemExit("The input file is either empty, or not formatted correctly. Please ensure that all lines are formatted correctly (rsID:Genotype,Genotype)")
    
    if isNoStudies:
        return None, None, None, None, isNoStudies, inputInFilters, unusedTraitStudyPairs

    studySnps = {}
    for snp in tableObjDict['associations'].keys():
        if ("rs" in snp):
            for trait in tableObjDict['associations'][snp]['traits'].keys():
                # initializing variables
                useTrait = False
                useStudy = False
                if traits is not None and trait.lower() in traits:
                    useTrait = True
                for studyID in tableObjDict['associations'][snp]['traits'][trait].keys():
                    if not isAllFiltersNone:
                        studyMetaData = tableObjDict['studyIDsToMetaData'][studyID] if studyID in tableObjDict['studyIDsToMetaData'].keys() else None
                        useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, studyID, trait, studyMetaData, useTrait)
                    if isAllFiltersNone or useStudy:
                        pValue = tableObjDict['associations'][snp]['traits'][trait][studyID]['pValue']
                        if pValue <= float(p_cutOff):
                            # Create a map between each study and the corresponding snps
                            if studyID in studySnps:
                                snpSet = studySnps[studyID]
                            else:
                                snpSet = set()
                            snpSet.add(snp)
                            studySnps[studyID]=snpSet
                        # check if we don't have any info with the trait/study combination
                        if (trait, studyID) not in neutral_snps_map and (trait, studyID) not in clumped_snps_map and (trait, studyID) not in counter_set:
                            if (trait, studyID) not in unusedTraitStudyPairs or unusedTraitStudyPairs[(trait, studyID)] != False:
                                unusedTraitStudyPairs[(trait, studyID)] = True
                        else:
                            unusedTraitStudyPairs[(trait, studyID)] = False
                            if (trait, studyID) not in neutral_snps_map:
                                neutral_snps_map[(trait, studyID)] = set()
                            if (trait, studyID) not in clumped_snps_map:
                                clumped_snps_map[(trait, studyID)] = set()
                            if (trait, studyID) not in counter_set:
                                sample_map[(trait, studyID)][""] = ""

    final_map = dict(sample_map)
    return final_map, neutral_snps_map, clumped_snps_map, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs


def parse_vcf(inputFile, clumpsObjDict, tableObjDict, traits, studyTypes, studyIDs, ethnicities, p_cutOff):
    vcf_reader = openFileForParsing(inputFile, False)

    # Create a default dictionary (nested dictionary)
    sample_map = defaultdict(dict)
    # Create a default dictionary (nested dictionary) with sample name, clump num, index snp
    index_snp_map = defaultdict(dict)

    # Create a list to keep track of which study/samples have viable snps and which ones don't 
    counter_set = set()
    neutral_snps_map = {}
    clumped_snps_map = {}
    sample_num = len(vcf_reader.samples)

    # Create a boolean to keep track of whether any studies pass the specified filters
    isNoStudies = True

    # keeps track of if any valid data is found in the file
    fileEmpty = True

    # True if at least one snp from the input file is in the filtered associations
    inputInFilters = False

    isAllFiltersNone = (traits is None and studyIDs is None and studyTypes is None and ethnicities is None)

    try:
        # Iterate through each line in the vcf file
        for record in vcf_reader:
            # a record exists, so the file was not empty
            fileEmpty = False
            string_format = str(record.FORMAT)
            if 'GT' in string_format: #TODO might not need this line anymore
                rsID = record.ID
                chromPos = str(record.CHROM) + ":" + str(record.POS)
                if (chromPos in tableObjDict['associations'] and (rsID is None or rsID not in tableObjDict['associations'])):
                    rsID = tableObjDict['associations'][chromPos]
                ALT = record.ALT
                REF = record.REF 
                # if the position is found in our database 
                if rsID in tableObjDict['associations']:
                    # data from the input file was found in the filtered database
                    inputInFilters = True
                    # Loop through each trait for the position
                    for trait in tableObjDict['associations'][rsID]['traits'].keys():
                        # initializing variables
                        useTrait = False
                        useStudy = False
                        # if there are traits to filter by and the trait for this snp is in the list, use this trait 
                        if traits is not None and trait.lower() in traits:
                            useTrait = True
                        # Loop through each study containing the position
                        for study in tableObjDict['associations'][rsID]['traits'][trait].keys():
                            # if we aren't going to use all the associations, decide if this is one that we will use
                            if not isAllFiltersNone:
                                studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                                useStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
                            if isAllFiltersNone or useStudy:
                                isNoStudies = False

                                # grab pValue and riskAllele
                                pValue = tableObjDict['associations'][rsID]['traits'][trait][study]['pValue']
                                riskAllele = tableObjDict['associations'][rsID]['traits'][trait][study]['riskAllele']

                                # compare the pvalue to the pvalue cutoff
                                if pValue <= float(p_cutOff):
                                    # Loop through each sample of the vcf file
                                    for call in record.samples:
                                        name = call.sample
                                        genotype = record.genotype(name)['GT']
                                        alleles = formatAndReturnGenotype(genotype, REF, ALT)

                                        # Create a tuple with the study and sample name
                                        trait_study_sample = (trait, study, name)

                                        # Grab or create sets
                                        clumpedVariants = clumped_snps_map[trait_study_sample] if trait_study_sample in clumped_snps_map else set()
                                        unmatchedAlleleVariants = neutral_snps_map[trait_study_sample] if trait_study_sample in neutral_snps_map else set()

                                        if riskAllele in alleles:
                                            # Add the study/sample tuple to the counter list because we now know at least there is
                                            # at least one viable snp for this combination 
                                            counter_set.add(trait_study_sample)

                                            if rsID in clumpsObjDict:
                                                # Grab the clump number associated with this study and snp position
                                                clumpNum = clumpsObjDict[rsID]['clumpNum']

                                                if trait_study_sample in index_snp_map:
                                                    # if the clump number for this snp position and study/name is already in the index map, move forward
                                                    if clumpNum in index_snp_map[trait_study_sample]:
                                                        index_snp = index_snp_map[trait_study_sample][clumpNum]
                                                        index_pvalue = tableObjDict['associations'][index_snp]['traits'][trait][study]['pValue']

                                                        # Check whether the existing index snp or current snp have a lower pvalue for this study
                                                        # and switch out the data accordingly
                                                        if pValue < index_pvalue:
                                                            del index_snp_map[trait_study_sample][clumpNum]
                                                            index_snp_map[trait_study_sample][clumpNum] = rsID
                                                            del sample_map[trait_study_sample][index_snp]
                                                            sample_map[trait_study_sample][rsID] = alleles
                                                            clumpedVariants.add(index_snp)
                                                        else:
                                                            if sample_map[trait_study_sample][index_snp] == "": #TODO does this case ever occur??
                                                                del index_snp_map[trait_study_sample][clumpNum]
                                                                index_snp_map[trait_study_sample][clumpNum] = rsID
                                                                del sample_map[trait_study_sample][index_snp]
                                                                sample_map[trait_study_sample][rsID] = alleles
                                                                clumpedVariants.add(index_snp)
                                                            else:
                                                                clumpedVariants.add(rsID)
                                                    else:
                                                        # Since the clump number for this snp position and study/name
                                                        # doesn't already exist, add it to the index map and the sample map
                                                        index_snp_map[trait_study_sample][clumpNum] = rsID
                                                        sample_map[trait_study_sample][rsID] = alleles
                                                else:
                                                    # Since the study/name combo wasn't already used in the index map, add it to both the index and sample map
                                                    index_snp_map[trait_study_sample][clumpNum] = rsID
                                                    sample_map[trait_study_sample][rsID] = alleles
                                            else:
                                                sample_map[trait_study_sample][rsID] = alleles
                                        else:
                                            unmatchedAlleleVariants.add(rsID)

                                        clumped_snps_map[trait_study_sample] = clumpedVariants
                                        neutral_snps_map[trait_study_sample] = unmatchedAlleleVariants

        # contains the trait/study combos that don't have any matching snps in the input file
        unusedTraitStudyPairs = {}

        # if the file is empty, or formatted incorrectly
        if fileEmpty:
            raise SystemExit("The VCF file is either empty, or not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")
        
        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        # TODO: might need a better way to handle this

        if isNoStudies:
            samples = []
            for name in vcf_reader.samples:
                samples.append(name)
            return samples, None, None, None, None, isNoStudies, inputInFilters, unusedTraitStudyPairs

        # Check to see which study/sample combos didn't have any viable snps
        # and create blank entries for the sample map for those that didn't
        # TODO: might need a better way to handle this
        for name in vcf_reader.samples:
            studySnps = {}
            for key in tableObjDict['associations'].keys():
                if ("rs" in key):
                    for trait in tableObjDict['associations'][key]['traits'].keys():
                        # initializing variables
                        useTrait = False
                        useStudy = False
                        if traits is not None and trait.lower() in traits:
                            useTrait = True
                        for study in tableObjDict['associations'][key]['traits'][trait].keys():
                            if not isAllFiltersNone:
                                studyMetaData = tableObjDict['studyIDsToMetaData'][study] if study in tableObjDict['studyIDsToMetaData'].keys() else None
                                addStudy = shouldUseAssociation(traits, studyIDs, studyTypes, ethnicities, study, trait, studyMetaData, useTrait)
                            if isAllFiltersNone or addStudy:
                                pValue = tableObjDict['associations'][key]['traits'][trait][study]['pValue']
                                if pValue <= float(p_cutOff):
                                    if study in studySnps:
                                        snpSet = studySnps[study]
                                    else:
                                        snpSet = set()
                                    snpSet.add(key)
                                    studySnps[study]=snpSet
                                # check if we don't have any info with the trait/study/samp combination
                                if (trait, study, name) not in neutral_snps_map and (trait, study, name) not in clumped_snps_map and (trait,study,name) not in counter_set:
                                    if (trait,study) not in unusedTraitStudyPairs or unusedTraitStudyPairs[(trait, study)] != False:
                                        unusedTraitStudyPairs[(trait, study)] = True
                                else:
                                    unusedTraitStudyPairs[(trait, study)] = False
                                    if (trait, study, name) not in neutral_snps_map:
                                        neutral_snps_map[(trait, study, name)] = set()
                                    if (trait, study, name) not in clumped_snps_map:
                                        clumped_snps_map[(trait, study, name)] = set()
                                    if (trait,study,name) not in counter_set:
                                        sample_map[(trait,study,name)][""] = ""
    except ValueError:
        raise SystemExit("The VCF file is not formatted correctly. Each line must have 'GT' (genotype) formatting and a non-Null value for the chromosome and position.")

    final_map = dict(sample_map)
    return final_map, neutral_snps_map, clumped_snps_map, sample_num, studySnps, isNoStudies, inputInFilters, unusedTraitStudyPairs


# checks if the file is a vaild zipped file and returns the extension of the file inside the zipped file
# a zipped file is valid if it is a zip, tar, or gz file with only 1 vcf/txt file inside
# returns and prints: ".vcf" or "txt" if the zipped file is valid and contains one of those files
                    # "False" if the file is not a zipped file
                    # error message if the file is a zipped file, but is not vaild
def getZippedFileExtension(filePath, shouldPrint):
    # if the file is a zip file
    if zipfile.is_zipfile(filePath):
        # open the file
        archive = zipfile.ZipFile(filePath, "r")
        # get the number of vcf/txt files inside the file
        validArchive = []
        for filename in archive.namelist():
            if filename[-4:].lower() == ".vcf" or filename[-4:].lower() == ".txt":
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
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is a tar-like file (tar, tgz, tar.gz, etc.)
    elif tarfile.is_tarfile(filePath):
        # open the file
        archive = tarfile.open(filePath)
        # get the number of vcf/txt files inside the file
        validArchive = []
        for tarInfo in archive.getmembers():
            if tarInfo.name[-4:].lower() == ".vcf" or tarInfo.name[-4:].lower() == ".txt":
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
            printIfShould(shouldPrint, msg)
            return msg
    # if the file is a gz file (checked last to not trigger for tar.gz)
    elif filePath.lower().endswith(".gz"):
        # if the gz file is a vcf/txt file, print and return the extension
        if filePath.lower().endswith(".txt.gz") or filePath.lower().endswith(".vcf.gz"):
            new_file = filePath[:-3]
            _, extension = os.path.splitext(new_file)
            extension = extension.lower()
            printIfShould(shouldPrint, extension)
            return extension
        # else print and return an error message
        else:
            msg = "The gzipped file is not a txt or vcf file. Please check the input file and try again"
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

