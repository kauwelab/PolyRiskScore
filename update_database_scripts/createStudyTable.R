# This script uses data from an existing folder populated with CSV trait data and the GWAS catalog acccessable via the gwasrapidd library 
# to make a study table CSV. 
#
# How to run: Rscript createStudyTable.R "associationTableFolderPath" "studyTableFolderPath" "rawStudyTSVFolderPath"
# where "associationTableFolderPath" is the path to the folder where the association table TSV is stored (default: "../tables/")
#       "studyTableFolderPath" is the path to the folder where the study table TSV will be created (default: "../tables/")
#       "rawStudyTSVFolderPath" is the path to the folder where the raw GWAS study TSVs are stored (default: "./")
#
# The format of the study table is as follows:
# studyID pubMedID  trait reportedTrait citation  altmetricScore  ethnicity superPopulation initialSampleSize replicationSampleSize sex pValueAnnotation  betaAnnotation  ogValueTypes  numAssociationsFiltered title lastUpdated
# where: "studyID" is the unique ID assigned by the GWAS database
#        "pubMedID" is the PubMed ID of the study
#        "trait" is the name of the trait assigned the study by the GWAS catalog
#        "reportedTrait" is the name of the trait that the authors listed for their study
#        "citation" is the first author, followed by the year the study was published (ex: "Miller 2020")
#        "altmetricScore" is the Altmetric score given to the study- it is a measure of the popularity of the study (see altmetric.com for more info)
#        "ethnicity" is a pipe (|) separated string of ethnicities involved in the study
#        "superPopulation" is a pipe (|) separated string of super populations involved in the study (based on the 5 populations from 1000 genomes)
#        "initialSampleSize" is the intitial sample size of the study
#        "replicationSampleSize" is the replication sample size of the study
#        "sex" is a string ("male" or "female") representing the study's sub study sex (default NA)
#        "pValueAnnotation" is a string containing one pValueAnnotation of the study
#        "betaAnnotation" is a string containing one betaAnnotation of the study
#        "ogValueTypes" is a pipe (|) deliminated string containing the study's value types ("OR", "beta", or "OR|beta")
#        "numAssociationsFiltered" is the number of SNPs filtered from the study (not in the associations table)
#        "title" is the the title of the study
#        "lastUpdated" is the date the study was last updated in the GWAS database

# get args from the commandline
args = commandArgs(trailingOnly=TRUE)
if (length(args)==0) {
  args[1] <- "../tables/"
  args[2] <- "../tables/"
  args[3] <- "./"
} else if (length(args)==1) {
  args[2] <- "../tables/"
  args[3] <- "./"
} else if (length(args)==2) {
  args[3] <- "./"
}

print("Initializing script!")
start_time <- Sys.time()

associationTablePath <- file.path(args[1], "associations_table.tsv")
studyTablePath <- file.path(args[2], "study_table.tsv")
rawStudyTablePath <- file.path(args[3], "rawGWASStudyData.tsv")
publicationsPath <- file.path(args[3], "rawGWASPublications.tsv")
ancestriesPath <- file.path(args[3], "rawGWASAncestries.tsv")
lastUpdatedPath <- file.path(args[3], "lastUpdated.tsv")

## imports and import downloads (dupicate from master_script.sh)---------------------------------------------------------------------------------
my_packages <- c("BiocManager", "rtracklayer", "remotes", "gwasrapidd", "tidyverse", "rAltmetric", "magrittr", "purrr")
not_installed <- my_packages[!(my_packages %in% installed.packages()[ , "Package"])] # Extract not installed packages
if(length(not_installed)) {
  print("Installing required packages, please wait...")
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
  if(length(not_installed)) {
    install.packages(not_installed, dependencies = TRUE, repos = "http://cran.us.r-project.org") # Install not installed packages
  }
}

# imports
suppressMessages(library(dplyr))
suppressMessages(library(tidyverse))
suppressMessages(library(gwasrapidd))
suppressMessages(library(rtracklayer))
suppressMessages(library(rAltmetric))
suppressMessages(library(magrittr))
suppressMessages(library(purrr))

## functions-----------------------------------------------------------------------------------------

# prints string by default unless isDev = FALSE- used for debugging
DevPrint <- function(string, isDev = TRUE) {
  if (isDev) {
    print(string)
  }
}

# gets a tibble containing the results of a single Altmetrics query
getAltmetrics <- function(pubmed_id) {
  result <- tryCatch(altmetrics(pmid = pubmed_id) %>% altmetric_data(), error=function(err) {
    tibble("pmid" = character(), "score" = character()) %>%
      add_row(pmid = as.character(pubmed_id), score = NA_character_)
  })
  return(result)
}

# returns the Altmetric score for the specified pubmed_id
getAltmetricScore <- function(pubmed_id) {
  return(as.numeric(getAltmetrics(pubmed_id)[["score"]]))
}

# sums all the numbers found in a string- used to calculate cohort size (if given a list, returns a list of nums)
SumNumsFromString <- function(string){
  sums <- c()
  result <- 0
  string <- str_replace_all(string, ",", "")
  for (i in 1:length(string)) {
    result <- result + sum(as.numeric(unlist(regmatches(string,gregexpr("[[:digit:]]+\\.*[[:digit:]]*",string)))))
    if (result > 0) {
      sums <- append(sums, result)
    }
    else {
      sums <- append(sums, NA)
    }
    result <- 0
  }
  return(sums)
}

# adds two numbers, accounting for NAs. If both are NA, returns NA, otherwise treats NA as 0
addWithNA <- function(var1, var2) {
  if (is.na(var1) && is.na(var2)){
    return(NA)
  }
  else if (is.na(var2)){
    return(var1)
  }
  else if(is.na(var1)){
    return(var2)
  }
  else{
    return(sum(var1, var2))
  }
}

# gets the trait name formated for website and database use (all lowercase, spaces to underscores, forward slashes to dashes, 
# and no commas or apostrophies)
getDatabaseTraitName <- function(traitName) {
  dbTraitName <- str_replace_all(str_replace_all(str_replace_all(str_replace_all(tolower(traitName), " ", "_"), ",", ""), "/", "-"), "'", "")
  return(dbTraitName)
}

getSuperPop <- function(ethnicity) {
  if (is.na(ethnicity)) {
    return(NA_character_)
  } else {
    superPopulation <- c()
    if (str_detect(ethnicity, regex("african", ignore_case = TRUE))) {
      superPopulation <- c(superPopulation, "African")
    } 
    if (str_detect(ethnicity, regex("(?<!african )american", ignore_case = TRUE))) { # match american, but not african american (negatve lookbehind)
      superPopulation <- c(superPopulation, "American")
    }
    if (str_detect(ethnicity, regex("european", ignore_case = TRUE))) {
      superPopulation <- c(superPopulation, "European")
    }
    if (str_detect(ethnicity, regex("south asian", ignore_case = TRUE))) {
      superPopulation <- c(superPopulation, "South Asian")
    }
    if (str_detect(ethnicity, regex("east asian", ignore_case = TRUE)) || str_detect(ethnicity, regex("asian unspecified", ignore_case = TRUE)) || str_detect(ethnicity, regex("oceanian", ignore_case = TRUE)) || str_detect(ethnicity, regex("central asian", ignore_case = TRUE))) {
      superPopulation <- c(superPopulation, "East Asian")
    }
    
    # if a super population could not be determined from the ethnicity, return NA, otherwise return a 
    # string with all super populations separated by the "|"
    if (length(superPopulation) == 0) {
      return(NA_character_)
    }
    else {
      return(paste0(superPopulation, collapse = "|"))
    }
  }
}

## code body---------------------------------------------------------------------------------------------------

# if the GWAS catalog is available
if (is_ebi_reachable()) {
  if (!file.exists(associationTablePath) || !file.exists(rawStudyTablePath) || !file.exists(publicationsPath) || !file.exists(ancestriesPath) || !file.exists(lastUpdatedPath)) {
    print("One or more of the following tables do not exist. Please check which ones are missing and run the downloadStudiesToFile.R or unpackDatabaseCommandLine.R scripts to create them.")
    print(associationTablePath)
    print(rawStudyTablePath)
    print(publicationsPath)
    print(ancestriesPath)
    print(lastUpdatedPath)
  }
  else {
    # initialize table
    studyTable <- tibble("studyID" = character(0), 
                         "pubMedID" = double(0), 
                         "trait" = character(0), 
                         "reportedTrait" = character(0), 
                         "citation" = character(0), 
                         "altmetricScore" = double(0), 
                         "ethnicity" = character(0),
                         "superPopulation" = character(0),
                         "initialSampleSize" = numeric(0), 
                         "replicationSampleSize" = numeric(0), 
                         "sex" = character(0), 
                         "pValueAnnotation" = character(0), 
                         "betaAnnotation" = character(0), 
                         "ogValueTypes" = character(0),
                         "numAssociationsFiltered" = numeric(0),
                         "title" = character(0), 
                         "lastUpdated" = character(0))

    DevPrint(paste0("Startup took ", format(Sys.time() - start_time)))
    DevPrint("Creating Study Table")
    
    # read in the associations table, and the raw studies, publications, and ancestries tables
    associationsTibble <- read_tsv(associationTablePath, col_types = cols(.default = col_guess(), hg38 = col_character(), hg19 = col_character(), hg18 = col_character(), hg17 = col_character(), sex = col_character()), locale = locale(encoding = "UTF-8"))
    studiesTibble <- read_tsv(rawStudyTablePath, col_types = cols(), locale = locale(encoding = "UTF-8"))
    publications <- read_tsv(publicationsPath, col_types = cols(), locale = locale(encoding = "UTF-8"))
    ancestries <- read_tsv(ancestriesPath, col_types = cols(), locale = locale(encoding = "UTF-8"))
    lastUpdatedTibble <- read_tsv(lastUpdatedPath, col_types = cols(), locale = locale(encoding = "UTF-8"))

    print("Study data read!")
    
    # gets the rows from the associations table that are distinct for (studyID, trait, sex, pValueAnnotation, betaAnnotation, and ogValueTypes)
    # studyIDRows is looped through to get study data for each study found in the associationsTibble, which is formated and written to file
    studyIDRows <- group_by(associationsTibble, studyID) %>%
      separate_rows(ogValueTypes,sep = "\\|") %>%
      mutate(numAssociationsFiltered = paste0(unique(numAssociationsFiltered[!is.na(numAssociationsFiltered)]), collapse = "|"))
    studyIDRows <- dplyr::select(arrange(distinct(studyIDRows, studyID, trait, sex, pValueAnnotation, betaAnnotation, ogValueTypes, .keep_all = TRUE), studyID), studyID, citation, trait, sex, pValueAnnotation, betaAnnotation, ogValueTypes, numAssociationsFiltered)
    
    for (i in 1:nrow(studyIDRows)) {
      tryCatch({
        studyIDRow <- studyIDRows[i,]

        studyID <- studyIDRow[["studyID"]]
        rawStudyData <- filter(studiesTibble, study_id == studyID)
        
        # get trait and reported trait in title case (tolower, then title case)
        # trait is obtained from the associations table, but reportedTrait is obtained from the GWAS catalog
        traitName <- str_to_title(tolower(unlist(strsplit(studyIDRow[["trait"]], split="\\|"))))
        reportedTrait <- str_to_title(tolower(rawStudyData[["reported_trait"]])) %>%
          str_replace_all("&([a-zA-Z]*);", "\\1") # replace Greek html characters with their name
        
        publication <- filter(publications, study_id == studyID)
        
        #get citaiton from the associations table
        citation <- studyIDRow[["citation"]]
        
        # get an Altmetric score for each pubMedID and association pubMedID to score in dictionary-like form
        pubMedID <- publication[["pubmed_id"]]
        altmetricScore <- getAltmetricScore(pubMedID)

        # gets the enthnicities for the specified studyID by combining all the ethnicities found in the ancestries tibble returning a 
        #list of all unique ethnicities separated by "|"
        ethnicity <- filter(ancestries, study_id == studyID) %>%
          dplyr::select(-ancestry_id) %>%
          group_by(study_id) %>%
          mutate(ethnicity = str_replace_all(paste0(unique(ancestral_group[!is.na(ancestral_group)]), collapse = "|"), ",", "")) %>%
          distinct(study_id, .keep_all = TRUE) %>%
          dplyr::select(-ancestral_group) %>%
          ungroup() %>%
          dplyr::select(-study_id)
        ethnicity <- ethnicity[["ethnicity"]]
        if (ethnicity == "" || is_empty(ethnicity)) {
          ethnicity <- NA_character_
        }
        
        superPopulation <- getSuperPop(ethnicity)

        # get the last time the study was updated from the lastUpdatedTibble
        lastUpdated <- as.character(lastUpdatedTibble[lastUpdatedTibble$studyID == studyID,]$lastUpdated)
        
        initialSampleSize <- SumNumsFromString(rawStudyData[["initial_sample_size"]])
        replicationSampleSize <- SumNumsFromString(rawStudyData[["replication_sample_size"]])
        
        sex <- studyIDRow[["sex"]]
        pValueAnnotation <- studyIDRow[["pValueAnnotation"]]
        betaAnnotation <- studyIDRow[["betaAnnotation"]]
        ogValueTypes <- studyIDRow[["ogValueTypes"]]
        numAssociationsFiltered <- strtoi(studyIDRow[["numAssociationsFiltered"]])
        
        title <- publication[["title"]]

        # populate the studyTable with data from the study
        studyTable <- add_row(studyTable, 
                              studyID = studyID, 
                              pubMedID = pubMedID,
                              trait = traitName,
                              reportedTrait = reportedTrait,
                              citation = citation,
                              altmetricScore = altmetricScore,
                              ethnicity = ethnicity,
                              superPopulation = superPopulation,
                              initialSampleSize = initialSampleSize,
                              replicationSampleSize = replicationSampleSize,
                              sex = sex,
                              pValueAnnotation = pValueAnnotation,
                              betaAnnotation = betaAnnotation,
                              ogValueTypes = ogValueTypes,
                              numAssociationsFiltered = numAssociationsFiltered,
                              title = title, 
                              lastUpdated = lastUpdated)
        
        # -------------------------------------------------------------------------------------------
        
        DevPrint(paste0(i, " of ", nrow(studyIDRows), " ", studyID, " complete!"))

        # print out a time stamp for how long the script has taken so far
        if (mod(i, 5) == 0) {
          print(paste0("Time elapsed: ", format(Sys.time() - start_time)))
        }
      }, error=function(e){cat("ERROR :",conditionMessage(e), "\n")})
    }
    studyTable <- arrange(studyTable, trait, citation)
    # write out the study table
    write.table(studyTable, file=studyTablePath, sep="\t", row.names=FALSE, quote=FALSE, fileEncoding = "UTF-8")
  }
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}

cat(paste0("Finished creating the study table. It can be found at", studyTablePath, "\n"))
print(paste0("Time elapsed to create the study table: ", format(Sys.time() - start_time)))
