#get args from the commandline
#args[1]- path where csvs are stored
args = commandArgs(trailingOnly=TRUE)
if (length(args)==0) {
  args[1] <- "./association_tables/"
}

print("Initializing script!")
start_time <- Sys.time()

studyTableDirPath <- args[1]


##imports and import downloads----------------------------------------------------------------------------------------------------------------------
my_packages <- c("BiocManager", "rtracklayer", "remotes", "gwasrapidd", "tidyverse", "rAltmetric", "magrittr", "purrr")
not_installed <- my_packages[!(my_packages %in% installed.packages()[ , "Package"])] # Extract not installed packages
if(length(not_installed)) {
  print("Installing required packages, please wait...")
  #packages with unique install procedures
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
  #if there are still packages to install, do it
  not_installed <- my_packages[!(my_packages %in% installed.packages()[ , "Package"])]
  if(length(not_installed)) {
    install.packages(not_installed, dependencies = TRUE, repos = "http://cran.us.r-project.org") # Install not installed packages
  }
}

#imports
suppressMessages(library(dplyr))
suppressMessages(library(tidyverse))
suppressMessages(library(gwasrapidd))
suppressMessages(library(rtracklayer))
suppressMessages(library(rAltmetric))
suppressMessages(library(magrittr))
suppressMessages(library(purrr))

##functions-----------------------------------------------------------------------------------------

#prints string by default unless isDev = FALSE- used for debugging
DevPrint <- function(string, isDev = TRUE) {
  if (isDev) {
    print(string)
  }
}

#gets a tibble containing the results of a single Altmetrics query
getAltmetrics <- function(pubmed_id) {
  result <- tryCatch(altmetrics(pmid = pubmed_id) %>% altmetric_data(), error=function(err) {
    tibble("pmid" = character(), "score" = character()) %>%
      add_row(pmid = as.character(pubmed_id), score = NA_character_)
  })
  return(result)
}

#gets a tibble containing the results of a list of Altmetrics queries, with only pubmed_id and score selected
getScoresList <- function(ids) {
  #TODO
  ids <<- ids
  scores <- pmap_df(ids, getAltmetrics) %>%
    dplyr::rename(pubmed_id = pmid) %>%
    select(c(pubmed_id, score)) %>%
    group_by(pubmed_id)
  return(scores)
}

#given a studyID, returns the most recent date a snp has been updated
getLastUpdated <- function(studyID) {
  return(max(as.Date(get_associations(study_id = studyID)@associations$last_update_date)))
}

#given a list of studyIDs, returns a list of the most recent dates each study has been updated
getLastUpdatedList <- function(studyIDs) {
  lastUpdatedList <- c()
  for (i in 1:length(studyIDs)) {
    lastUpdatedList = append(lastUpdatedList, getLastUpdated(studyIDs[i]))
  }
  return(lastUpdatedList)
}

#sums all the numbers found in a string- used to calculate cohort size (if given a list, returns a list of nums)
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

#adds two numbers, accounting for NAs. If both are NA, returns NA, otherwise treats NA as 0
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

#given a study, adds the intitial sample size to the replication sample size and returns the resulting integer
getCohort <- function(study) {
  study <<- study
  return(addWithNA(SumNumsFromString(pull(study@studies["initial_sample_size"])), SumNumsFromString(pull(study@studies["replication_sample_size"]))))
}

#gets cohort size from each study
getCohorts <- function(studies) {
  cohorts <- c()
  for (i in 1:nrow(studies@studies)) {
    cohorts <- append(cohorts, getCohort(studies[i]))
  }
  return(cohorts)
}

#gets the trait name formated for website and database use
  #all lowercase, spaces to underscores, forward slashes to dashes, and no commas or apostrophies
getDatabaseTraitName <- function(traitName) {
  dbTraitName <- str_replace_all(str_replace_all(str_replace_all(str_replace_all(tolower(traitName), " ", "_"), ",", ""), "/", "-"), "'", "")
  return(dbTraitName)
}
#code body---------------------------------------------------------------------------------------------------

#if the GWAS catalog is available
if (is_ebi_reachable()) {
  #Get all the csvs in the folder
  files <- list.files(path = studyTableDirPath, pattern = "\\.csv$")
  if (length(files) <= 0) {
    print(paste0("No CSV files at ", studyTableDirPath))
  }
  else {
    #initialize tables
    traitTable <- tibble("trait" = character(0), "studyIDs" = character(0))
    studyTable <- tibble("studyID" = character(0), "pubMedID" = character(0), "citation" = character(0), "studyScore" = character(0), "ethnicity" = character(0), "cohort" = numeric(0), "title" = character(0), "lastUpdated" = character(0))

    DevPrint(paste0("Startup took ", format(Sys.time() - start_time)))
    DevPrint("Creating Study Table")
    
    for (i in 1:length(files)) {
      tryCatch({
        #get name of trait from name of csv file
        traitName <- substr(files[i], 0, nchar(files[i])-4)
        traitName <- str_replace_all(traitName, "ö", "o") #removes the ö from Löfgren's syndrome to make it easier to put it in the database
        if (traitName == "study_table" || traitName == "trait_table") {
          DevPrint(paste0("Skipped ", traitName))
          next
        }
        #read the csv file and get its studyIDs
        filePath = paste0(studyTableDirPath, files[i])
        csvTable <- read.csv(filePath) %>%
          group_by(studyID) %>%
          distinct(studyID, .keep_all = TRUE) %>%
          select(studyID, citation)
        studyIDs <- as.character(unlist(csvTable$studyID))
        #from the studyIDs, get their information from the GWAS catalog
        studies <- get_studies(study_id = studyIDs)
        
        publications <- distinct(studies@publications, study_id, .keep_all = TRUE)
        citations <- tibble(citation = paste(publications$author_fullname, substr(publications$publication_date, 1, 4)))
        
        #get an Altmetric score for each pubMedID and association pubMedID to score in dictionary-like form
        pubMedIDs <- as.character(publications$pubmed_id)
        pubMedIDToScoreTibble <- getScoresList(list(pubMedIDs))
        pubMedIDToScoreDict <- with(pubMedIDToScoreTibble, setNames(score, pubmed_id))
        
        #string of studyIDs deliminated by "|" used in the trait_table
        studyIDListStr <- paste(studyIDs, collapse = "|")
        traitTable <- add_row(traitTable, trait = traitName, studyIDs = studyIDListStr)
        #create a dictionary-like object with study_ids as keys and ancestry strings as values (used for the ethnicity column)
        ethnicity <- select(studies@ancestral_groups, -ancestry_id) %>%
          group_by(study_id) %>%
          mutate(ethnicity = str_replace_all(paste0(unique(ancestral_group[!is.na(ancestral_group)]), collapse = "|")), ",", "") %>% #TODO test this! should remove commas!
          distinct(study_id, .keep_all = TRUE) %>%
          select(-ancestral_group) %>%
          dplyr::rename(studyID = "study_id")
        ethnicity <- full_join(tibble(studyID = studyIDs), ethnicity, by = "studyID")
#-------------------------------------------------------------------------------------------
        
        #match studyID to the most recent time the study was updated, then get the lastUpdated list in order
        lastUpdatedTibble <- tibble(studyID = studyIDs)
        lastUpdatedTibble <- add_column(lastUpdatedTibble, lastUpdated = getLastUpdatedList(lastUpdatedTibble$studyID))
        lastUpdated = as.character(lastUpdatedTibble$lastUpdated)
        
        cohort <- getCohorts(studies)
        studyTable <- add_row(studyTable, 
                              studyID = studyIDs, 
                              pubMedID = pubMedIDs, 
                              citation = citations$citation, 
                              studyScore = unname(pubMedIDToScoreDict[pubMedID]),
                              ethnicity = ethnicity$ethnicity,
                              cohort = cohort, 
                              title = studies@publications$title, 
                              lastUpdated = lastUpdated)
        
        DevPrint(paste0(i, " of ", length(files), " ", traitName, " complete with ", length(studyIDs), " studies."))
        if (mod(i, 5) == 0) {
          print(paste0("Time elapsed: ", format(Sys.time() - start_time)))
        }
      }, error=function(e){cat("ERROR :",conditionMessage(e), "\n")})
    }
    studyTable <- distinct(studyTable, studyID, .keep_all = TRUE) #removes duplicate studyIDs (TODO- why are these duplicates created?)
    studyTable <- arrange(studyTable, studyID)
    #write out the trait and study tables
    write.csv(traitTable, file.path(getwd(), "trait_table.csv"), row.names=FALSE)
    write.csv(studyTable, file.path(getwd(), "study_table.csv"), row.names=FALSE)
  }
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}

print(paste0("Total time elapsed: ", format(Sys.time() - start_time)))