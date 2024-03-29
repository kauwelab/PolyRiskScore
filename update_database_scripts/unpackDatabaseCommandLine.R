#!/usr/bin/env Rscript

# This script downloads data from the GWAS catalog using the gwasrapidd library and puts it into a single association table, organized by study ID. The script
# can be run multiple times concurrently on different portions of the dataset to speed up the download rate. The GWAS database dataset can be split into roughly
# even sections that each instance of this script will handle independently. The handling of multiple instances of the script is done by the master_script.sh,
# but it can also be run manually. If you want the whole GWAS catalog downloaded in 8 instances manually, set numGroups to 8 and run the script 8 times, 
# incrementing groupNum between each instance starting at 1 and going to 8 (see commandline arguments below).
#
# How to run: Rscript unpackDatabaseCommandLine.R "associationTableFolderPath" "rawGWASTSVFolderPath" "chainFileFolderPath" "groupNum" "numGroups"
# where: "associationTableFolderPath" is the path to the association TSV table folder where table will be written (default: "../tables/").
#        "rawGWASTSVFolderPath" is the path to the folder where the TSVs rawGWASStudyData.tsv and rawGWASPublications.tsv are located (default: "./").
#        "chainFileFolderPath" is the path to the folder where chain files will be stored (default: 1).
#        "groupNum" is the integer group number or index between 1 and numGroups inclusive. 
#        "numGroups" is the integer number of times the database will be split. This particular instance will run on the "groupNum" section (default: 1).
#
# The format of the association table is as follows:
# snp hg38  hg19  hg18  hg17  gene  raf riskAllele  pValue  pValueAnnotation  oddsRatio lowerCI upperCI citation  studyID
# where: "snp" is the rs id for the given SNP
#        "hg38" is hg38 mapped location
#        "hg19" is hg19 mapped location
#        "hg18" is hg18 mapped location
#        "hg17" is hg17 mapped location
#        "trait is the name of the trait associated with the snp
#        "gene" is a is a pipe (|) separated list of gene:distanceToGene strings (ex: C1orf140:107304|AL360013.2:64825)
#        "raf" is the risk allele frequency
#        "riskAllele" is the risk allele
#        "pValue" is the p-value
#        "pValueAnnotation" is the description associated with the given p-value
#        "oddsRatio" is the odds ratio associated with the given p-value
#        "lowerCI" is the lower confidence interval of the odds ratio
#        "upperCI" is the upper confidence interval of the odds ratio
#        "sex" is the sex associated with the snp p-value
#        "citation" is the first author, followed by the year the study was published (ex: "Miller 2020")
#        "studyID" is the unique ID assigned by the GWAS database to the study associated with the given SNP

# TODO add population column
  # "population" is the population associated with the snp p-value 
  # possible population mappings
  # africanAmericanAfroCaribbean <- c()
  # africanUnspecified <- c()
  # asianUnspecified <- c()
  # eastAsian <- c()
  # european <- c()
  # greaterMiddleEastern <- c()
  # hispanicLatinAmericam <- c()
  # nativeAmerican <- c()
  # oceanian <- c()
  # southAsian <- c()
  # southEastAsian <- c()
  # subSaharanAfrican <- c()
  # african <- c(africanAmericanAfroCaribbean, africanUnspecified, subSaharanAfrican)
  # american <- c()

# causes warning messages to print as soon as they occur
options(warn=1)

# get args from the commandline- these are evaluated after imports section below
args = commandArgs(trailingOnly=TRUE)
if (length(args)==0) {
  args[1] <- "../tables/"
  args[2] <- "./"
  args[3] <- "./"
  args[4] <- 1
  args[5] <- 1
} else if (length(args)==1) {
  args[2] <- "./"
  args[3] <- "./"
  args[4] <- 1
  args[5] <- 1
} else if (length(args)==2) {
  args[3] <- "."
  args[4] <- 1
  args[5] <- 1
} else if (length(args)==3) {
  args[4] <- 1
  args[5] <- 1
}else if (length(args)==4) {
  args[5] <- 1
}

print("Initializing script!")
start_time <- Sys.time()

## imports and import downloads----------------------------------------------------------------------------------------------------------------------
my_packages <- c("BiocManager", "rtracklayer", "remotes", "gwasrapidd", "tidyverse", "rAltmetric", "magrittr", "purrr")                                  # Specify your packages
not_installed <- my_packages[!(my_packages %in% installed.packages()[ , "Package"])]              # Extract not installed packages
if(length(not_installed)) {
  print("Installing the following required packages:")
  print(not_installed)
  # packages with unique install procedures
  if ("BiocManager" %in% not_installed) {
    install.packages("BiocManager", repos = "http://cran.us.r-project.org")
  }
  if ("rtracklayer" %in% not_installed) {
    BiocManager::install("rtracklayer")
  }
  if ("remotes" %in% not_installed) {
    install.packages("remotes", repos = "http://cran.us.r-project.org")
  }
  if ("gwasrapidd" %in% not_installed) {
    remotes::install_github("ramiromagno/gwasrapidd")
  }
  # if there are still packages to install, do it
  not_installed <- my_packages[!(my_packages %in% installed.packages()[ , "Package"])]
  if (length(not_installed)) {
    install.packages(not_installed, dependencies = TRUE, repos = "http://cran.us.r-project.org") # Install not installed packages
  }
} else {
  print('All required packages already installed.')
}

# imports
suppressMessages(library(dplyr))
suppressMessages(library(tidyverse))
suppressMessages(library(gwasrapidd))
suppressMessages(library(rtracklayer))
suppressMessages(library(rAltmetric))
suppressMessages(library(magrittr))
suppressMessages(library(purrr))
#----------------------------------------------------------------------------------------------

if (is_ebi_reachable()) {
  # evaulate command line arguments if supplied
  outPath <- args[1]
  rawGWASTSVFolderPath <- args[2]
  chainFilePath <- args[3]
  groupNum <- as.numeric(args[4])
  numGroups <- as.numeric(args[5])
  dir.create(file.path(outPath), showWarnings = FALSE)
  # remove the old associations_table.tsv and create a new blank one with column names "columnNames" and no data yet
  columnNames <- c("snp", "hg38", "hg19", "hg18", "hg17", "trait", "gene", "raf", "riskAllele", "pValue", "pValueAnnotation", "oddsRatio", "lowerCI", "upperCI", "sex", "citation", "studyID")
  writeLines(paste(columnNames, collapse = "\t"), file.path(outPath, "associations_table.tsv"))

  # remove the old lastUpdated.tsv and create a new blank one with column names "lastUpdatedColumnNames" and no data yet
  lastUpdatedColumnNames <- c("studyID", "lastUpdated")
  writeLines(paste(lastUpdatedColumnNames, collapse = "\t"), file.path(rawGWASTSVFolderPath, "lastUpdated.tsv"))
  
  # the minimum number of SNPs a study must have to be valid and outputted
  minNumStudyAssociations <- 1
  
  # the paths to the chain files used for reference genome location conversions
  # doing "showConnections" and "closeAllConnections" after each of the following lines seems
  # to remove the 3 "Warning: closing unused connection" warnings that used to appear
  path38To19 = file.path(chainFilePath, "hg38ToHg19.over.chain")
  showConnections(all=TRUE)
  closeAllConnections()
  path19To18 = file.path(chainFilePath, "hg19ToHg18.over.chain")
  showConnections(all=TRUE)
  closeAllConnections()
  path19to17 = file.path(chainFilePath, "hg19ToHg17.over.chain")
  showConnections(all=TRUE)
  closeAllConnections()
  ch38To19 = import.chain(path38To19)
  showConnections(all=TRUE)
  closeAllConnections()
  ch19To18 = import.chain(path19To18)
  showConnections(all=TRUE)
  closeAllConnections()
  ch19To17 = import.chain(path19to17)
  showConnections(all=TRUE)
  closeAllConnections()
  
## functions-----------------------------------------------------------------------------------------
  
  # prints string by default unless isDev = FALSE: used for debugging
  DevPrint <- function(string, isDev = TRUE) {
    if (isDev) {
      print(string)
    }
  }
  
  # converts an tibble hg column to BED format (chrNum \t startIndex \t stopIndex) if the hgCol has an NA, the resulting row in the tibble is 
  # returned as "chr1  -2  -1" so as to give an NA in the hgToHg method
  getBedFromCol <- function(hgCol) {
    bed <- tidyr::extract(hgCol, 1, into = c("chr", "start"), regex = "(\\d+):(\\d+)", convert = TRUE) %>%
      mutate(start = replace_na(start, -2)) %>%
      mutate(stop = as.numeric(start) + 1) %>%
      add_column(beginning = "chr") %>%
      unite(seqnames, c(beginning,chr), sep = "") %>% 
      mutate_if(is.character, str_replace_all, pattern = "chrNA", replacement = "chr1") #removes chrNA
    return(bed)
  }
  
  # converts given hg column to the second hg string type. Assumes firstHgCol's name is hg#
  hgToHg <- function(firstHgCol, secondHgStr) {
    firstHgName <- names(firstHgCol)[1]
    firstHgBed <- getBedFromCol(firstHgCol)
    grs <- makeGRangesFromDataFrame(firstHgBed)
    
    hgChain <- NA
    if (firstHgName == "hg38") {
      hgChain <- ch38To19
    }else if (firstHgName == "hg19" && secondHgStr == "hg18") {
      hgChain <- ch19To18
    }else if (firstHgName == "hg19" && secondHgStr == "hg17") {
      hgChain <- ch19To17
    } else {
      print(paste("ERROR! First hg is", firstHgName, "and second hg is", secondHgStr))
    }
    results <- liftOver(grs, hgChain)
      # the as_tibble function puts out a warning message that isn't important, so suppressWarnings is used
    secondHgTibble <- suppressWarnings(as_tibble(results)) %>%
      unite(!!(secondHgStr), seqnames:start, sep = ":")
    secondHgTibble <- mutate(secondHgTibble, !!(secondHgStr) := str_extract(secondHgTibble[[3]], "\\d+:\\d+")) %>%
      select(!!(secondHgStr))
    
    #TODO there has to be a better way to do this... can the as_tibble function keep empty GRanges?
    # fills in rows that weren't able to be converted 
    failedIndecies <- which(as.numeric(results@partitioning) %in% NA)
    if (length(failedIndecies) > 0) {
      print(paste0("WARNING: failed to convert the following positions from ", firstHgName, " to ", secondHgStr))
      for (i in 1:length(failedIndecies)) {
        print(paste0(firstHgCol[[failedIndecies[i], 1]], " at index ", failedIndecies[i]))
      }
      for (i in 1:length(failedIndecies)) {
        secondHgTibble <- add_row(secondHgTibble, .before=failedIndecies[i])
      }
    }
    return(secondHgTibble[[1]])
  }

  # splits numStudies into minimaly sized groups, then returns the start and stop indicies for the given group number. When groups aren't even, the 
  # remainder is split between the last groups. The first group starts at 1 and the last group stops at numStudies. 
  # eg: if there are 9000 studies and 2 groups, then the groupings are as follows:
  # group 1: (1, 4500), group 2: (4501, 9000)
  getStartAndEndIndecies <- function(numStudies, groupNum, numGroups) {
    # if there are more groups than studies, this function doesn't work
    if (numStudies < numGroups) {
      return("Error")
    }
    else { 
      # split up the remainder between the last groups
      zp = numGroups - (numStudies %% numGroups)
      increment = floor(numStudies / numGroups) 
      if(groupNum > zp) {
        startIndex <- (increment * (groupNum - 1)) + ((groupNum - 1) - zp) + 1
        stopIndex <- (increment * groupNum) + (groupNum - zp)
      }
      else {
        startIndex <- increment * (groupNum - 1) + 1
        stopIndex <- increment * groupNum
      }
      return(c(startIndex, stopIndex))
    }
  }
  
  # formats the associationsTable for output by removing unneeded rows, renaming the remaining rows, and adding hg columns
  formatAssociationsTable <- function(associationsTable) {
    if (nrow(associationsTable) > 0) {
      # renames columns to names the database will understand
      associationsTable <- ungroup(associationsTable) %>%
        dplyr::rename(snp = variant_id, raf = risk_frequency, riskAllele = risk_allele, pValue = pvalue, pValueAnnotation = pvalue_description, oddsRatio = or_per_copy_number)
      # selects specific columns to keep. also arranges the assocition table by citation, then studyID, then snp
      associationsTable <- select(associationsTable, c(snp, hg38, trait, gene, raf, riskAllele, pValue, pValueAnnotation, oddsRatio, lowerCI, upperCI, sex, citation, studyID)) %>%
        arrange(citation, studyID, snp)
      
      # gets hg19, hg18, hg17 for the traits
      associationsTable <- add_column(associationsTable, hg19 = hgToHg(associationsTable["hg38"], "hg19"), .after = "hg38")
      associationsTable <- add_column(associationsTable, hg18 = hgToHg(associationsTable["hg19"], "hg18"), .after = "hg19")
      associationsTable <- add_column(associationsTable, hg17 = hgToHg(associationsTable["hg19"], "hg17"), .after = "hg18")
      # removes the NAs from the data
      # the as.data.frame function puts out a warning message that isn't important, so suppressWarnings is used
      associationsTable <- suppressWarnings(as.data.frame(associationsTable)) %>% replace(., is.na(.), "")
      return(associationsTable)
    }
  }
  
  # appends the contents of the associationsTable to the associations table found in the outPath folder
  appendToAssociationsTable <- function(associationsTable) {
    # writes out the data into a TSV at outPath (from argv)
    write.table(associationsTable, file=file.path(outPath, "associations_table.tsv"), sep="\t", col.names=FALSE, row.names=FALSE, quote=FALSE, append=TRUE, fileEncoding = "UTF-8")
  }
  
  # if the current study index is divisible by 10, formats the contents of the associationsTable tibble
  # and adds it to the associations table found in the outPath folder
  appendWithCheck <- function() {
    # for every 10 studies, append to the associations_table.tsv
    if (i %% 10 == 0) {
      # if there are studies in the associations table, print them out and reset the tibble
      if (nrow(associationsTable) > 0) {
        associationsTable <- formatAssociationsTable(associationsTable)
        appendToAssociationsTable(associationsTable)
        # reset the associationsTable and keep going
        associationsTable <<- tibble()
        indecesAppendedStr <<- paste(studyIndeciesAppended,collapse=",")
        DevPrint(paste0("Appended studies to output file: ", indecesAppendedStr, " of ", stopIndex))
        studyIndeciesAppended <<- c()
      }
      DevPrint(paste0("Time elapsed: ", format(Sys.time() - start_time)))
    }
  }
  
  # skips the current SNP, but checks to see if previous data should be added to the associations table
  nextWithAppendCheck <- function() {
    appendWithCheck()
    return(NULL)
  }

  # if the data object does not have enough SNPs, prints and returns NULL
  checkIfValidDataObj <- function(dataObj) {
    if (nrow(dataObj) < minNumStudyAssociations) {
      # get the name of the variable passed into the function
      dataObjName <- deparse(substitute(dataObj))
      invalidStudies <<- c(invalidStudies, studyID)
      DevPrint(paste0("    Not enough valid ", dataObjName, " info for ", citation))
      return(nextWithAppendCheck())
    }
    return("good")
  }
  
  # returns a vector of NA, male, or female given a vector of p-value descriptions
  getSexesFromDescriptions <- function(pValueDescription) {
    femaleIndicator <- "female"
    maleIndicator <- "male"
    sexes <- c()
    for (desc in pValueDescription) {
      desc <- tolower(desc)
      if (is.na(desc)) {
        sexes <- c(sexes, NA)
      }
      else if (str_detect(desc, "female") || str_detect(desc, "woman") || str_detect(desc, "women")) {
        sexes <- c(sexes, femaleIndicator)
      }
      else if (str_detect(desc, "male") || str_detect(desc, "man") || str_detect(desc, "men")) {
        sexes <- c(sexes, maleIndicator)
      }
      else {
        sexes <- c(sexes, NA)
      }
    }
    return(sexes)
  }
  
#------------------------------------------------------------------------------------------------------------------------
  
  # get study data from TSVs
  print("Reading study data from TSVs!")
  # get study data for all the studies
  studiesTibble <- read_tsv(file.path(rawGWASTSVFolderPath, "rawGWASStudyData.tsv"), col_types = cols(), locale = locale(encoding = "UTF-8"))
  # get publication data for all the studies
  publications <- read_tsv(file.path(rawGWASTSVFolderPath, "rawGWASPublications.tsv"), col_types = cols(), locale = locale(encoding = "UTF-8"))
  print("Study data read!")

  # get the start and stop indecies of the study data given groupNum and numGroups
  startAndStopIndecies <- getStartAndEndIndecies(nrow(studiesTibble), groupNum, numGroups)
  startIndex <- startAndStopIndecies[1]
  stopIndex <- startAndStopIndecies[2]
  
  # initialize invalidStudies array
  invalidStudies <- c()
  #initiaize the new assocations table
  associationsTable <- tibble()
  # initiaize lastUpdated tibble with studyID and lastUpdated as columns
  lastUpdatedTibble <- tibble(studyID = character(), lastUpdated = character())
  
  # holds the indices (i) that have been appended to the associationsTable
  studyIndeciesAppended <- c()
  
  DevPrint(paste0("Startup took ", format(Sys.time() - start_time)))
  DevPrint(paste0("Getting data from studies ", startIndex, " to ", stopIndex))
  # for each study
  for (i in startIndex:stopIndex) {
    tryCatch({
      # gets the study ID
      studyID <- pull(studiesTibble[i, "study_id"])
      
      # get citation data (author + year published)
      citation <- paste(sub(" .*", "", pull(publications[i, "author_fullname"])), "et al.",  str_sub(pull(publications[i, "publication_date"]), 0, 4))
      # get pubmed ID for the study
      pubmedID <- pull(publications[i, "pubmed_id"])
      
      # if the study ID is invalid, skip it (currently does nothing since all studies are only visited once)
      # this structure may be useful later for additional script speedups
      if (studyID %in% invalidStudies) {
        DevPrint(paste0("    skipping study bc not enough valid snps: ", citation, " - ", studyID))
        nextWithAppendCheck()
      }
      DevPrint(paste0("  ", i, ". ", citation, " - ", studyID))

      # gets the association data associated with the study ID
      associations <- get_associations(study_id = studyID)
      associationsTibble <- associations@associations
      # filter out blank ORs, invalid ORs, and SNPs associated with other SNPs
      associationsTibble <- filter(associationsTibble, !is.na(or_per_copy_number)&(or_per_copy_number > -1)&!grepl("condition", pvalue_description)&!grepl("adjusted for rs", pvalue_description))
      # check if associationsTibble has enough snps
      if (is.null(checkIfValidDataObj(associationsTibble))) {next}

      # gets single snps not part of haplotypes (remove group_by and filter to get all study snps)
      riskAlleles <- associations@risk_alleles %>%
        group_by(association_id) %>% 
        filter(dplyr::n()==1)
      #filter out empty risk alleles, and snp ids that don't start with rs
      riskAlleles <- filter(riskAlleles, !is.na(risk_allele)&startsWith(variant_id, "rs"))
      # check if riskAlleles has enough snps
      if (is.null(checkIfValidDataObj(riskAlleles))) {next}

      # gets the variants data associated with the study ID
      variants <- get_variants(study_id = studyID)
      # contains last update date for each variant ID
      variantsTibble <- variants@variants
      # check if variantsTibble has enough snps
      if (is.null(checkIfValidDataObj(variantsTibble))) {next}

      # contains gene names, position, and distances from nearest genes for each variant ID
      genomicContexts <- variants@genomic_contexts
      # check if genomicContexts has enough snps
      if (is.null(checkIfValidDataObj(genomicContexts))) {next}

      # merge data together
      master_variants <- full_join(genomicContexts, variantsTibble, by = "variant_id") %>%
      dplyr::filter(!grepl('CHR_H', chromosome_name.x)) %>% # removes rows that contain "CHR_H" so that only numerical chrom names remain (these tend to be duplicates of numerically named chroms anyway)
        unite("gene", gene_name, distance, sep = ":") %>%
        mutate_if(is.character, str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% # removes NA:NA from columns that don't have a gene or distance
        group_by(variant_id) %>%
        summarise_all(list(~toString(unique(na.omit(.))))) %>%
        mutate(gene = str_replace_all(gene, ", ", "|")) # separates each gene_name:distance pair by "|" instead of ", "
      # set the values of all empty cells to NA
      if (nrow(master_variants) > 0) {
        master_variants[master_variants == ""] <- NA
      }
      # check if master_variants has enough snps
      if (is.null(checkIfValidDataObj(master_variants))) {next}

      # get a list of the assoication ids
      association_ids <- associationsTibble[["association_id"]]
      names(association_ids) <- association_ids
      # get traits for each of the assoication ids in title case form (tolower, then title case)
      traits <- association_ids %>%
        purrr::map(~ get_traits(association_id = .x)@traits) %>%
        dplyr::bind_rows(.id = 'association_id') %>%
        mutate(trait=str_to_title(tolower(trait)))
      # merge the traits with the assoications- note: some associations have multiple traits, 
      # so the traits table length is >= the length of assicationsTibble
      associationsTibble <- dplyr::left_join(associationsTibble, traits, by = 'association_id')
      
      master_associations <- inner_join(riskAlleles, associationsTibble, by = "association_id")
      # check if master_associations has enough snps
      if (is.null(checkIfValidDataObj(master_associations))) {next}

      studyData <- left_join(master_associations, master_variants, by = "variant_id") %>%
        unite("hg38", chromosome_name.x:chromosome_position.x, sep = ":", na.rm = FALSE) %>%
        mutate_at('hg38', str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% # if any chrom:pos are empty, puts NA instead
        mutate_at("range", str_replace_all, pattern = ",", replacement = ".") %>% # replaces the comma in the upperCI of study GCST002685 SNP rs1366200
        tidyr::extract(range, into = c("lowerCI", "upperCI"),regex = "(\\d+.\\d+)-(\\d+.\\d+)") %>%
        add_column(citation = citation) %>%
        add_column(studyID = studyID, .after = "citation") %>%
        add_column(sex = getSexesFromDescriptions(master_associations[["pvalue_description"]])) %>%
        mutate(pvalue_description = tolower(pvalue_description))
      # filter out SNPs on the X or Y chromosome
      studyData <- filter(studyData, !startsWith(hg38, "X")&!startsWith(hg38, "Y"))
      # check if studyData has enough snps
      if (is.null(checkIfValidDataObj(studyData))) {next}

      associationsTable <- bind_rows(studyData, associationsTable)
      
      # add lastUpdated to rawGWASStudyData.tsv
      lastUpdatedTibble <- add_row(lastUpdatedTibble, studyID = studyID, lastUpdated = as.character(max(as.Date(associationsTibble$last_update_date))))
      
      studyIndeciesAppended <- c(studyIndeciesAppended, i)
      
      # for every 10 studies, append to the associations_table.tsv
      appendWithCheck()
    }, error=function(e){
      cat("ERROR:",conditionMessage(e), "\n")
      if (conditionMessage(e) == "cannot open the connection") {
        stop("The table was likely opened during the download process and can't be used by the program. Please close the table and try again.")
      }
    })
  }
  
  # if there are any studies left in the associationsTable, append them to the output file
  if (nrow(associationsTable) > 0) {
    associationsTable <- formatAssociationsTable(associationsTable)
    appendToAssociationsTable(associationsTable)
    indecesAppendedStr <- paste(studyIndeciesAppended,collapse=",")
    DevPrint(paste0("Appended studies to output file: ", indecesAppendedStr, " of ", stopIndex))
  }
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}

# write to lastUpdated.tsv
write.table(lastUpdatedTibble, file=file.path(rawGWASTSVFolderPath, "lastUpdated.tsv"), sep="\t", col.names=FALSE, row.names=FALSE, quote=FALSE, append=TRUE, fileEncoding = "UTF-8")

DevPrint(paste("Studies with no valid snps:", length(invalidStudies)))
DevPrint(invalidStudies)
print(paste0("Data download and unpack complete! ", "took: ", format(Sys.time() - start_time)))
