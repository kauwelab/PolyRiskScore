# This script uses data from an existing folder populated with CSV trait data and the GWAS catalog acccessable via the gwasrapidd library 
# to make a study table CSV. 
#
# How to run: Rscript createStudyTable.R "associationTableFolderPath" "studyTableFolderPath" "rawStudyTSVFolderPath"
# where "associationTableFolderPath" is the path to the folder where the association table TSV is stored (default: "../tables/")
#       "studyTableFolderPath" is the path to the folder where the study table TSV will be created (default: "../tables/")
#       "rawStudyTSVFolderPath" is the path to the folder where the raw GWAS study TSVs are stored (default: "./")
#
# The format of the study table is as follows:
# studyID pubMedID  trait reportedTrait citation  altmetricScore  ethnicity initialSampleSize replicationSampleSize title lastUpdated
# where: "studyID" is the unique ID assigned by the GWAS database
#        "pubMedID" is the PubMed ID of the study
#        "trait" is the name of the trait assigned the study by the GWAS catalog
#        "reportedTrait" is the name of the trait that the authors listed for their study
#        "citation" is the first author, followed by the year the study was published (ex: "Miller 2020")
#        "studyScore" is the Altmetric score given to the study- it is a measure of the popularity of the study (see altmetric.com for more info)
#        "ethnicity" is a pipe (|) separated list of ethnicities involved in the study
#        "initialSampleSize" is the intitial sample size of the study
#        "replicationSampleSize" is the replication sample size of the study
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
    studyTable <- tibble("studyID" = character(0), "pubMedID" = double(0), "trait" = character(0), reportedTrait = character(0), "citation" = character(0), "altmetricScore" = double(0), "ethnicity" = character(0), "initialSampleSize" = numeric(0), "replicationSampleSize" = numeric(0), "title" = character(0), "lastUpdated" = character(0))

    DevPrint(paste0("Startup took ", format(Sys.time() - start_time)))
    DevPrint("Creating Study Table")
    
    # read in the associations table, and the raw studies, publications, and ancestries tables
    associationsTibble <- read_tsv(associationTablePath, col_types = cols(.default = col_guess(), hg38 = col_character(), hg19 = col_character(), hg18 = col_character(), hg17 = col_character(), sex = col_character()))
    studiesTibble <- read_tsv(rawStudyTablePath, col_types = cols())
    publications <- read_tsv(publicationsPath, col_types = cols())
    ancestries <- read_tsv(ancestriesPath, col_types = cols())
    lastUpdatedTibble <- read_tsv(lastUpdatedPath, col_types = cols())

    print("Study data read!")
    
    # gets distint studyIDs from associationsTibble, keeping the citation as well as a bar ("|") deliminated list of traits for that studyID
    # studyIDRows is looped through to get study data for each study found in the associationsTibble, which is formated and written to file
    # keeping traits keeps only valid traits from a study (ex: if a study reports 10 traits, but only 2 have valid snps, the study_table will 
    # only have 2 traits).
    studyIDRows <- group_by(associationsTibble, studyID) %>%
      mutate(trait = paste0(unique(trait[!is.na(trait)]), collapse = "|"))
    studyIDRows <- select(arrange(distinct(studyIDRows, studyID, .keep_all = TRUE), studyID), studyID, citation, trait)
    
    for (i in 1:nrow(studyIDRows)) {
      tryCatch({
        studyIDRow <- studyIDRows[i,]

        studyID <- studyIDRow[["studyID"]]
        rawStudyData <- filter(studiesTibble, study_id == studyID)
        
        # get trait and reported trait in title case (tolower, then title case)
        # trait is obtained from the associations table, but reportedTrait is obtained from the GWAS catalog
        traitName <- str_to_title(tolower(unlist(strsplit(studyIDRow[["trait"]], split="\\|"))))
        reportedTrait <- str_to_title(tolower(rawStudyData[["reported_trait"]]))
        
        publication <- filter(publications, study_id == studyID)
        
        #get citaiton from the associations table
        citation <- studyIDRow[["citation"]]
        
        # get an Altmetric score for each pubMedID and association pubMedID to score in dictionary-like form
        pubMedID <- publication[["pubmed_id"]]
        altmetricScore <- getAltmetricScore(pubMedID)

        # gets the enthnicities for the specified studyID by combining all the ethnicities found in the ancestries tibble returning a 
        #list of all unique ethnicities separated by "|"
        ethnicity <- filter(ancestries, study_id == studyID) %>%
          select(-ancestry_id) %>%
          group_by(study_id) %>%
          mutate(ethnicity = str_replace_all(paste0(unique(ancestral_group[!is.na(ancestral_group)]), collapse = "|"), ",", "")) %>%
          distinct(study_id, .keep_all = TRUE) %>%
          select(-ancestral_group) %>%
          ungroup() %>%
          select(-study_id)
        ethnicity <- ethnicity[["ethnicity"]]
        if (is_empty(ethnicity)) {
          ethnicity <- NA
        }

        # get the last time the study was updated from the lastUpdatedTibble
        lastUpdated <- lastUpdatedTibble[lastUpdatedTibble$studyID == studyID,]$lastUpdated
        
        initialSampleSize <- SumNumsFromString(rawStudyData[["initial_sample_size"]])
        replicationSampleSize <- SumNumsFromString(rawStudyData[["replication_sample_size"]])
        
        # TODO the title for study ID "GCST004165" has a ligated character in it (https://github.com/EBISPOT/gwas-user-requests/issues/7)
        # R doesn't seem to be able to remove it, so we'll have to wait for the GWAS catalog people to do it.
        #trait <- str_replace_all(publication[["title"]], "???", "fi") 
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
                              initialSampleSize = initialSampleSize,
                              replicationSampleSize = replicationSampleSize,
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
    write.table(studyTable, file=studyTablePath, sep="\t", row.names=FALSE, quote=FALSE, fileEncoding = "native.enc")
  }
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}

print(paste0("Finished creating the study table. It can be found at", studyTablePath, "\n"))
print(paste0("Time elapsed to create the study table: ", format(Sys.time() - start_time)))
