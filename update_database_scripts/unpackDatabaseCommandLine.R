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
# snp	hg38	hg19	hg18	hg17	trait	gene	raf	riskAllele	pValue	pValueAnnotation	oddsRatio	lowerCI	upperCI	betaValue	betaUnit	betaAnnotation	ogValueTypes	sex	numAssociationsFiltered	citation	studyID	
# where: "snp" is the rs id for the given SNP
#        "hg38" is hg38 mapped location
#        "hg19" is hg19 mapped location
#        "hg18" is hg18 mapped location
#        "hg17" is hg17 mapped location
#        "trait" is the name of the trait associated with the snp
#        "gene" is a is a pipe (|) separated list of gene:distanceToGene strings (ex: C1orf140:107304|AL360013.2:64825)
#        "raf" is the risk allele frequency
#        "riskAllele" is the risk allele
#        "pValue" is the p-value
#        "pValueAnnotation" is the description associated with the given p-value
#        "oddsRatio" is the odds ratio associated with the given p-value
#        "lowerCI" is the lower confidence interval of the odds ratio
#        "upperCI" is the upper confidence interval of the odds ratio
#        "betaValue" is the beta value
#        "betaUnit" is the unit of the beta value
#        "betaAnnotation" is the description assoicated with the given beta value
#        "ogValueTypes" is a ¦ delimited string containing the value type ("OR", "beta", or "OR¦beta")
#        "sex" is the sex associated with the snp p-value
#        "numAssociationsFiltered" is the number of associations filtered out of the study (not in the associations table)
#        "citation" is the first author, followed by the year the study was published (ex: "Miller 2020")
#        "studyID" is the unique ID assigned by the GWAS database to the study associated with the given SNP

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
my_packages <- c("BiocManager", "rtracklayer", "myvariant", "remotes", "gwasrapidd", "tidyverse", "rAltmetric", "magrittr", "purrr")                                  # Specify your packages
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
  if ("myvariant" %in% not_installed) {
    BiocManager::install("myvariant")
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
suppressMessages(library(myvariant))
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
  columnNames <- c("snp", "hg38", "hg19", "hg18", "hg17", "trait", "gene", "raf", "riskAllele", "pValue", "pValueAnnotation", "oddsRatio", "lowerCI", "upperCI", "betaValue", "betaUnit", "betaAnnotation", "ogValueTypes", "sex", "numAssociationsFiltered", "citation", "studyID")
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
  path19To38 = file.path(chainFilePath, "hg19ToHg38.over.chain")
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
  ch19To38 = import.chain(path19To38)
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
    }else if (firstHgName == "hg19" && secondHgStr == "hg38") {
      hgChain <- ch19To38
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
      dplyr::select(!!(secondHgStr))
    
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
  
  addPosColumns <- function(associationsTable) {
    # if any positions are missing from hg38, use myvariant to get hg19, then get hg38, else get hg19
    unknownSNPPosIDs <- unique(studyData[is.na(studyData$hg38),]["variant_id"]) # get the unknown pos SNP IDs
    if (nrow(unknownSNPPosIDs) > 0) {
      # get the positions of SNPs that don't have their positions listed in the GWAS catalog
      unknownSNPPosObjs <- suppressWarnings(getVariants(unknownSNPPosIDs)) # get the SNP info objects using myvariant (it gets hg19 positions)
      snpPosTable <- tibble(snp = unknownSNPPosObjs@listData[["dbsnp.rsid"]], hg19 = paste0(unknownSNPPosObjs@listData[["dbsnp.chrom"]], ":", unknownSNPPosObjs@listData[["dbsnp.hg19.start"]]))
      snpPosTable <- snpPosTable[!duplicated(snpPosTable), ] # remove duplicate SNPs from snpPosTable
      snpPosTable <- add_column(snpPosTable, hg38 = hgToHg(snpPosTable["hg19"], "hg38"), .after = "snp") # get hg38 from hg19
      associationsTable <- left_join(associationsTable, snpPosTable, by = "snp") %>% # fill in the new hg38 positions for the associations table
        mutate(hg38 = coalesce(hg38.x, hg38.y)) %>%
        dplyr::select(-hg38.x, -hg38.y) %>%
        relocate(hg38, .after = snp)
      hg19Col <- tibble(associationsTable["snp"], hg19 = hgToHg(associationsTable["hg38"], "hg19"))
      hg19Col <- suppressWarnings(mutate(hg19Col, hg19 = hg19))
      hg19Col <- hg19Col[!duplicated(hg19Col), ] # remove duplicate SNPs from hg19Col table
      associationsTable <- left_join(associationsTable, hg19Col, by = "snp") %>% # fill in the new hg19 positions to the existing hg19 values from myvariant
        mutate(hg19 = coalesce(hg19.x, hg19.y)) %>%
        dplyr::select(-hg19.x, -hg19.y) %>%
        relocate(hg19, .after = hg38)
    } else {
      # gets hg19 for the snps
      associationsTable <- add_column(associationsTable, hg19 = hgToHg(associationsTable["hg38"], "hg19"), .after = "hg38")
    }
    
    # gets hg18 and hg17 for the snps
    associationsTable <- add_column(associationsTable, hg18 = hgToHg(associationsTable["hg19"], "hg18"), .after = "hg19")
    associationsTable <- add_column(associationsTable, hg17 = hgToHg(associationsTable["hg19"], "hg17"), .after = "hg18")
    return (associationsTable)
  }
  
  # formats the associationsTable for output by removing unneeded rows, renaming the remaining rows, and adding hg columns
  formatAssociationsTable <- function(associationsTable) {
    if (nrow(associationsTable) > 0) {
      # renames columns to names the database will understand
      associationsTable <- ungroup(associationsTable) %>%
        dplyr::rename(snp = variant_id, raf = risk_frequency, riskAllele = risk_allele, pValue = pvalue, pValueAnnotation = pvalue_description, oddsRatio = or_per_copy_number, betaAnnotation = beta_description, betaUnit = beta_unit)
      # selects specific columns to keep. also arranges the association table by citation, then studyID, then snp
      associationsTable <- dplyr::select(associationsTable, c(snp, hg38, trait, gene, raf, riskAllele, pValue, pValueAnnotation, oddsRatio, lowerCI, upperCI, betaValue, betaUnit, betaAnnotation, ogValueTypes, sex, numAssociationsFiltered, citation, studyID)) %>%
        arrange(citation, studyID, snp)
      
      # adds the position columns to the table (hg38, hg19, hg18, and hg17)
      associationsTable <- addPosColumns(associationsTable)
      
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
  
  # appends the contents of the lastUpdatedTibble to the last updated table found in the rawGWASTSVFolderPath folder
  appendToLastUpdatedTable <- function(lastUpdatedTibble) {
    # writes out the data into a TSV at rawGWASTSVFolderPath (from argv)
    write.table(lastUpdatedTibble, file=file.path(rawGWASTSVFolderPath, "lastUpdated.tsv"), sep="\t", col.names=FALSE, row.names=FALSE, quote=FALSE, append=TRUE, fileEncoding = "UTF-8")
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
        appendToLastUpdatedTable(lastUpdatedTibble)
        # reset the associationsTable and lastUpdatedTibble and keep going
        associationsTable <<- tibble()
        lastUpdatedTibble <<- tibble(studyID = character(), lastUpdated = character())
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
  checkIfValidDataObj <- function(dataObj, message = "") {
    if (nrow(dataObj) == 0 || nrow(dataObj) < minNumStudyAssociations) {
      # get the name of the variable passed into the function
      dataObjName <- deparse(substitute(dataObj))
      invalidStudies <<- c(invalidStudies, studyID)
      if (message == "") {
        DevPrint(paste0("    Not enough valid ", dataObjName, " info for ", citation))
      } else {
        DevPrint(message)
      }
      return(nextWithAppendCheck())
    }
    return("good")
  }
  
  # returns a vector of NA, male, or female given a vector of p-value descriptions and a vector beta descriptions
  getSexesFromDescriptions <- function(pValueDescription, betaDescription) {
    femaleIndicator <- "female"
    maleIndicator <- "male"
    sexes <- c()
    for (i in 1:length(pValueDescription)) {
      pValDesc <- pValueDescription[i]
      betaValDesc <- betaDescription[i]
      
      if (is.na(pValDesc) && is.na(betaValDesc)) {
        sexes <- c(sexes, NA)
      }
      else {
        # sex for this row defaults to NA
        sex <- NA
        # set the values to something other than NA so they can be searched via str_detect
        if (is.na(pValDesc)) {
          pValDesc <- "NULL"
        }
        if (is.na(betaValDesc)) {
          betaValDesc <- "NULL"
        }
        
        # combine the descriptions to only do one search
        descs <- paste(pValDesc, betaValDesc)

        # search both combined description variable for key words indicating sex using the following regex:
        # (^|[^a-zA-Z])((wo)?m[ae]n|(fe)?male)([^a-zA-Z]|$) where:
          # (^|[^a-zA-Z]) match start or non alphabetical character
          # ((wo)?m[ae]n|(fe)?male) match woman, women, female, man, men, and male
          # ([^a-zA-Z]|$) match end or not alphabetical character
        # female
        if (str_detect(descs, regex("(^|[^a-zA-Z])(wom[ae]n|females?)([^a-zA-Z]|$)", ignore_case = TRUE))) {
          sex <- femaleIndicator
        }
        # male
        if (str_detect(descs, regex("(^|[^a-zA-Z])(m[ae]n|males?)([^a-zA-Z]|$)", ignore_case = TRUE))){
          if (is.na(sex)) {
            sex <- maleIndicator
          } else { # if sex is already female, set to NA
            sex <- NA
          }
        }
        # add the sex determined to the column to return
        sexes <- c(sexes, sex)
      }
    }
    return(sexes)
  }
  
  # given a list of beta numbers and their directions, returns the beta number list with negative beta numbers for directions that are a "decrease"
  getBeta <- function(betaNumbers, betaDirections) {
    betas <- c()
    for (i in 1:length(betaNumbers)) {
      betaNum <- betaNumbers[[i]]
      if (!is.na(betaNum)) {
        betaDirect <- betaDirections[[i]]
        if (betaDirect == "decrease") {
          betas <- c(betas, betaNum * -1) # add a "-" if the direction is a decrease
        }
        else {
          betas <- c(betas, betaNum) # append the beta number if the direction is an increase
        }
      }
      else {
        betas <- c(betas, NA) # append NA if the beta number is NA
      }
    }
    return (betas)
  }
  
  # given a list of ors and betas (assumed to be the same length), returns a list types, 1 for each pair
  # ex: if both the or and beta are present, returns a list of "OR|beta" of length "length(ors)"
  # ex2: if only the or is present, returns a list of "OR" of length "length(ors)"
  getOGValueTypes <- function(ors, betas) {
    valTypes <- c()
    for (i in 1:length(ors)) {
      type = c()
      or <- ors[[i]]
      beta <- betas[[i]]
      if (!is.na(or)) {
        type <- c(type, "OR")
      }
      if (!is.na(beta)) {
        type <- c(type, "beta")
      }
      type <- paste(type, sep="¦", collapse="¦")
      valTypes <- c(valTypes, type)
    }
    return (valTypes)
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
      # get author last name, remove iii, jr, and 3rd, remove initials of first and middle names, add et al. on the end, and add study published year on end
      lastName <- str_remove_all(pull(publications[i, "author_fullname"]), " Ii{1,2}")
      lastName <- str_remove_all(lastName, " [Jj]r\\.?")
      lastName <- str_remove_all(lastName, " 3rd")
      citation <- paste(sub("(.*)( .{1,3})$", "\\1", lastName), "et al.",  str_sub(pull(publications[i, "publication_date"]), 0, 4))
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
      numTotalAssociations <- nrow(associationsTibble)
      # filter out SNPs associated with other SNPs
      associationsTibble <- filter(associationsTibble, !grepl("condition", pvalue_description, ignore.case = TRUE)&!grepl("adjusted for rs", pvalue_description, ignore.case = TRUE))
      associationsTibble <- filter(associationsTibble, !grepl("conditon", pvalue_description, ignore.case = TRUE)) # GCST001969 has this improper spelling
      associationsTibble <- filter(associationsTibble, !is.na(or_per_copy_number)&(or_per_copy_number > 0)|!is.na(beta_number))
      associationsTibble <- filter(associationsTibble, (is.na(or_per_copy_number)|or_per_copy_number != 0)) %>% # remove the 0 OR in GCST90000621
        dplyr::select(-last_mapping_date, -last_update_date) # remove dates to later filter out rows that are unique for all other columns

      # check if associationsTibble has enough snps
      if (is.null(checkIfValidDataObj(associationsTibble))) {next}

      # gets single snps not part of haplotypes (to get haplotype SNPs again, remove "group_by" and "filter")
      riskAlleles <- associations@risk_alleles %>%
        group_by(association_id) %>%
        filter(dplyr::n()==1)
      # filter out empty risk alleles, and snp ids that don't start with rs
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
      master_variants <- full_join(genomicContexts, variantsTibble, by = c("variant_id", "chromosome_name", "chromosome_position")) %>%
      dplyr::filter(!grepl('CHR_H', chromosome_name, ignore.case = TRUE)) %>% # removes rows that contain "CHR_H" so that only numerical chromosome names remain (these tend to be duplicates of numerically named chromosome anyway)
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

      # get a list of the association ids
      association_ids <- associationsTibble[["association_id"]]
      names(association_ids) <- association_ids
      # get traits for each of the association ids in title case form (tolower, then title case)
      traits <- association_ids %>%
        purrr::map(~ get_traits(association_id = .x)@traits) %>%
        dplyr::bind_rows(.id = 'association_id') %>%
        mutate(trait=str_to_title(tolower(trait)))
      # merge the traits with the associations- note: some associations have multiple traits, 
      # so the traits table length is >= the length of assicationsTibble
      associationsTibble <- dplyr::left_join(associationsTibble, traits, by = 'association_id')
      
      master_associations <- inner_join(riskAlleles, associationsTibble, by = "association_id")
      # check if master_associations has enough snps
      if (is.null(checkIfValidDataObj(master_associations))) {next}

      studyData <- left_join(master_associations, master_variants, by = "variant_id") %>%
        unite("hg38", c(chromosome_name, chromosome_position), sep = ":", na.rm = FALSE) %>%
        mutate_at('hg38', str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% # if any chrom:pos are empty, puts NA instead
        mutate_at("range", str_replace_all, pattern = ",", replacement = ".") %>% # replaces the comma in the upperCI of study GCST002685 SNP rs1366200
        tidyr::extract(range, into = c("lowerCI", "upperCI"),regex = "(\\d+.\\d+)-(\\d+.\\d+)") %>%
        add_column(citation = citation) %>%
        add_column(studyID = studyID, .after = "citation") %>%
        add_column(sex = getSexesFromDescriptions(master_associations[["pvalue_description"]], master_associations[["beta_description"]])) %>%
        add_column(betaValue = getBeta(master_associations[["beta_number"]], master_associations[["beta_direction"]]), .after = "upperCI") %>%
        add_column(ogValueTypes = getOGValueTypes(master_associations[["or_per_copy_number"]], master_associations[["beta_number"]]), .after = "betaValue") %>%
        mutate(pvalue_description = tolower(pvalue_description)) %>%
        mutate_at('pvalue_description', str_replace_all, pattern = "\\|", replacement = "¦") %>% # if the bar is in the annotation, replaces it with a broken vertical bar
        mutate_at('beta_description', str_replace_all, pattern = "\\|", replacement = "¦") %>% # if the bar is in the annotation, replaces it with a broken vertical bar
        mutate_at('trait', str_replace_all, pattern = "\\|", replacement = "¦") %>%
        replace_na(list(pvalue_description = "NA")) # replace NA character with NA string for p-value description
      # filter out SNPs on the X or Y chromosome (keeping NAs)
      studyData <- filter(studyData, !startsWith(hg38, "X")&!startsWith(hg38, "Y")|is.na(hg38))
      # filter out duplicate rows that are the same for all columns except for association_id
      studyData <- distinct(studyData[, -which(names(studyData) == "association_id")])
      
      # remove associations with "&" in the rsID- these are misreported multi-snp associations (one snp in GCST90019511, GCST90019512, and GCST90019515 each)
      studyData <- filter(studyData, !grepl("&",variant_id))
      
      # validate rsids by removing faulty characters (letters, asterisks, or crosses etc. after the ID)
      studyData$variant_id <- gsub("(rs\\d*).*","\\1",as.character(studyData$variant_id))
      
      # if the ogValueTypes is beta and the beta unit is "NA", sets the beta unit to "unit"
      studyData <- mutate(studyData, beta_unit = case_when(ogValueTypes != "beta" ~ beta_unit,
                                                          ogValueTypes == "beta" & beta_unit != "NA" & !is.na(beta_unit) ~ beta_unit,
                                                          ogValueTypes == "beta" & beta_unit == "NA" | is.na(beta_unit) ~ "unit"))
      
      # filter out snps that have multiple beta units for a unique combinations of trait, pValueAnnotation, betaAnnotation, ogValueType, and studyID (many of these beta units should be the same, but aren't due to typos)
      studyData <- studyData %>%
        group_by(trait, pvalue_description, beta_description, ogValueTypes, studyID) %>%
        mutate(unique_beta_units = n_distinct(tolower(beta_unit))) %>% # create column counting number of unique beta units per group
        filter(unique_beta_units==1) %>% # remove all groups with more than 1 unique beta unit
        dplyr::select(-unique_beta_units) # remove the unique beta units column
      
      # resolve snps that have differences in rounding which leads to duplicates
      studyData <- studyData %>%
        mutate(rounded_beta = floor(betaValue) + signif(betaValue - floor(betaValue), 2)) %>% # create a rounded betaValue column for comparing (2 sig figs after the decimal)
        mutate(rounded_odds = floor(or_per_copy_number) + signif(or_per_copy_number - floor(or_per_copy_number), 2)) %>% # create a rounded oddsRatio column for comparing (2 sig figs after the decimal)
        group_by(variant_id, risk_allele, pvalue, trait, pvalue_description, beta_description, beta_unit, ogValueTypes, studyID, rounded_beta, rounded_odds) %>%
        mutate(num_rounded_repeated_snps = dplyr::n()) %>%
        ungroup() %>%
        group_by(variant_id, risk_allele, pvalue, trait, pvalue_description, beta_description, beta_unit, ogValueTypes, studyID, betaValue, or_per_copy_number) %>%
        mutate(num_repeated_snps = dplyr::n()) %>%
        ungroup() %>%
        mutate(or_per_copy_number = ifelse(num_rounded_repeated_snps > 1 & num_repeated_snps == 1, rounded_odds, or_per_copy_number)) %>%
        mutate(betaValue = ifelse(num_rounded_repeated_snps > 1 & num_repeated_snps == 1, rounded_beta, betaValue)) %>%
        distinct(variant_id, risk_allele, pvalue, trait, pvalue_description, beta_description, beta_unit, ogValueTypes, studyID, betaValue, or_per_copy_number, .keep_all = TRUE) %>%
        dplyr::select(-rounded_beta, -rounded_odds, -num_repeated_snps, -num_rounded_repeated_snps) # remove the rounded columns and repeated_snps columns
      
      # remove the studies with snps that we can't resolve
      studyData <- studyData %>%
        group_by(variant_id, risk_allele, trait, pvalue_description, beta_description, ogValueTypes, studyID) %>%
        mutate(num_repeated_snps = dplyr::n()) %>%
        ungroup()
      if (nrow(filter(studyData, num_repeated_snps>1)) > 0) {
        studyData <- tibble()
      }
      
      # check if studyData has enough snps
      if (is.null(checkIfValidDataObj(studyData, paste0("    Study skipped due to unresolved duplicate SNPs: ", citation)))) {next}
      
      # calculate the total number of SNPS that have been filtered out for the study and add it as a column      
      numFinalAssociations <- length(studyData[["variant_id"]])
      numAssociationsFiltered <- numTotalAssociations - numFinalAssociations
      studyData <- add_column(studyData, numAssociationsFiltered = numAssociationsFiltered, .after = "sex")

      associationsTable <- bind_rows(studyData, associationsTable)
      
      # add lastUpdated to tibble
      lastUpdatedTibble <- add_row(lastUpdatedTibble, studyID = studyID, lastUpdated = as.character(max(as.Date(associationsTable$last_update_date))))
      
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
    appendToLastUpdatedTable(lastUpdatedTibble)
    indecesAppendedStr <- paste(studyIndeciesAppended,collapse=",")
    DevPrint(paste0("Appended studies to output file: ", indecesAppendedStr, " of ", stopIndex))
  }
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}

DevPrint(paste("Studies with no valid snps:", length(invalidStudies)))
DevPrint(invalidStudies)
print(paste0("Data download and unpack complete! ", "took: ", format(Sys.time() - start_time)))
