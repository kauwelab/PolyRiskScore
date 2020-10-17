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
#        "gene" is a is a pipe (|) separated list of gene:distanceToGene strings (ex: C1orf140:107304|AL360013.2:64825)
#        "raf" is the risk allele frequency
#        "riskAllele" is the risk allele
#        "pValue" is the p-value
#        "pValueAnnotation" is the description associated with the given p-value (TODO-temporary!!!)
#        "oddsRatio" is the odds ratio associated with the given p-value
#        "lowerCI" is the lower confidence interval of the odds ratio
#        "upperCI" is the upper confidence interval of the odds ratio
#        "citation" is the first author, followed by the year the study was published (ex: "Miller 2020")
#        "studyID" is the unique ID assigned by the GWAS database to the study associated with the given SNP
#
#TODO remove snps that have "(conditioned on rsid)" in their pvalue_description
#TODO argument: optional list of traits to update
#TODO argument: optional list of studies to update

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
  columnNames <- c("snp", "hg38", "hg19", "hg18", "hg17", "gene", "raf", "riskAllele", "pValue", "pValueAnnotation", "oddsRatio", "lowerCI", "upperCI", "citation", "studyID")
  writeLines(paste(columnNames, collapse = "\t"), file.path(outPath, "associations_table.tsv"))

  # the minimum number of SNPs a study must have to be valid and outputted
  minNumStudyAssociations <- 1
  
  # the paths to the chain files used for reference genome location conversions
  path38To19 = file.path(chainFilePath, "hg38ToHg19.over.chain")
  path19To18 = file.path(chainFilePath, "hg19ToHg18.over.chain")
  path19to17 = file.path(chainFilePath, "hg19ToHg17.over.chain")
  ch38To19 = import.chain(path38To19)
  ch19To18 = import.chain(path19To18)
  ch19To17 = import.chain(path19to17)
  
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
    secondHgTibble <- as_tibble(results) %>%
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
        dplyr::rename(snp = variant_id,raf = risk_frequency, riskAllele = risk_allele, pValue = pvalue, pValueAnnotation = pvalue_description, oddsRatio = or_per_copy_number)
      # arranges the trait table by author, then studyID, then snpid. also adds a unique identifier column
      associationsTable <- select(associationsTable, c(snp, hg38, gene, raf, riskAllele, pValue, pValueAnnotation, oddsRatio, lowerCI, upperCI, citation, studyID)) %>%
        arrange(citation, studyID, snp)
      
      # gets hg19, hg18, hg17 for the traits
      associationsTable <- add_column(associationsTable, hg19 = hgToHg(associationsTable["hg38"], "hg19"), .after = "hg38")
      associationsTable <- add_column(associationsTable, hg18 = hgToHg(associationsTable["hg19"], "hg18"), .after = "hg19")
      associationsTable <- add_column(associationsTable, hg17 = hgToHg(associationsTable["hg19"], "hg17"), .after = "hg18")
      # removes the NAs from the data
      associationsTable <- as.data.frame(associationsTable) %>% replace(., is.na(.), "")
      return(associationsTable)
    }
  }
  
  # appends the contents of the associationsTable to the associations table found in the outPath folder
  appendToAssociationsTable <- function(associationsTable) {
    # writes out the data into a TSV at outPath (from argv)
    write_tsv(associationsTable, file.path(outPath, "associations_table.tsv"), append = TRUE)
  }
  
#------------------------------------------------------------------------------------------------------------------------
  
  # get study data from TSVs
  print("Reading study data from TSVs!")
  # get study data for all the studies
  studiesTibble <- read_tsv(file.path(rawGWASTSVFolderPath, "rawGWASStudyData.tsv"), col_types = cols())
  # get publication data for all the studies
  publications <- read_tsv(file.path(rawGWASTSVFolderPath, "rawGWASPublications.tsv"), col_types = cols())
  print("Study data read!")

  # get the start and stop indecies of the study data given groupNum and numGroups
  startAndStopIndecies <- getStartAndEndIndecies(nrow(studiesTibble), groupNum, numGroups)
  startIndex <- startAndStopIndecies[1]
  stopIndex <- startAndStopIndecies[2]
  
  # initialize invalidStudies array
  invalidStudies <- c()
  #initiaize the new assocations table
  associationsTable <- tibble()
  
  DevPrint(paste0("Startup took ", format(Sys.time() - start_time)))
  DevPrint(paste0("Getting data from studies ", startIndex, " to ", stopIndex))
  # for each study
  for (i in startIndex:stopIndex) {
    tryCatch({
      # starts a timer to time how long it takes to output this study's results
      study_time <- Sys.time()
      
      # gets the study ID
      studyID <- pull(studiesTibble[i, "study_id"])
      
      # get citation data (author + year published)
      citation <- paste(str_replace(pull(publications[i, "author_fullname"]), "�", "o"), str_sub(pull(publications[i, "publication_date"]), 1, 4)) #TODO make more robust removing strange o from L�fgren's syndrome
      # get pubmed ID for the study
      pubmedID <- pull(publications[i, "pubmed_id"]) #TODO
      
      # if the study ID is invalid, skip it #TODO- where should this go?
      if (studyID %in% invalidStudies) {
        DevPrint(paste0("    skipping study bc not enough snps: ", citation, "-", studyID))
        next
      } else {
        DevPrint(paste0("  ", i, ". ", citation))
      }
      
      # gets the association data associated with the study ID
      associations <- get_associations(study_id = studyID)
      associationsTibble <- associations@associations
      # gets single snps not part of haplotypes (remove group_by and filter to get all study snps)
      riskAlleles <- associations@risk_alleles %>%
        group_by(association_id) %>% 
        filter(dplyr::n()==1)
      
      # gets the variants data associated with the study ID
      variants <- get_variants(study_id = studyID)
      variantsTibble <- variants@variants
      genomicContexts <- variants@genomic_contexts
      
      # gets the traits data associated with the study ID
      traitsTibble <- get_traits(study_id = studyID)@traits
      
      # merge data together
      master_variants <- full_join(genomicContexts, variantsTibble, by = "variant_id") %>%
        dplyr::filter(!grepl('CHR_H', chromosome_name.x)) %>% # removes rows that contain "CHR_H" so that only numerical chrom names remain (these tend to be duplicates of numerically named chroms anyway)
        unite("gene", gene_name, distance, sep = ":") %>%
        mutate_if(is.character, str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% # removes NA:NA from columns that don't have a gene or distance
        group_by(variant_id) %>% 
        summarise_all(list(~toString(unique(na.omit(.))))) %>%
        mutate(gene = str_replace_all(gene, ", ", "|")) # separates each gene_name:distance pair by "|" instead of ", "
      master_variants[master_variants == ""] <- NA
      master_associations <- left_join(riskAlleles, associationsTibble, by = "association_id")
      studyData <- left_join(master_associations, master_variants, by = "variant_id") %>%
        unite("hg38", chromosome_name.x:chromosome_position.x, sep = ":", na.rm = FALSE) %>%
        mutate_at('hg38', str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% # if any chrom:pos are empty, puts NA instead
        tidyr::extract(range, into = c("lowerCI", "upperCI"),regex = "(\\d+.\\d+)-(\\d+.\\d+)") %>%
        add_column(citation = citation) %>%
        add_column(studyID = studyID, .after = "citation")
      # remove rows missing risk alleles or odds ratios, or which have X as their chromosome
      studyData <- filter(studyData, !is.na(risk_allele)&!is.na(or_per_copy_number)&startsWith(variant_id, "rs")&!startsWith(hg38, "X"))
      
      # if there are not enough snps left in the study table, add it to a list of ignored studies
      if (nrow(studyData) < minNumStudyAssociations) {
        invalidStudies <- c(invalidStudies, studyID)
      } else { # otherwise add the rows to the association table
        associationsTable <- bind_rows(studyData, associationsTable)
      }
      
      # for every 10 studies, append to the associations_table.tsv
      studiesInterval <- 10
      if (i %% studiesInterval == 0) {
        associationsTable <- formatAssociationsTable(associationsTable)
        appendToAssociationsTable(associationsTable)
        # reset the associationsTable and keep going
        associationsTable <- tibble()
        DevPrint(paste0("Appended studies to output file: ", i-studiesInterval+1, "-", i))
      }
      
    }, error=function(e){
      cat("ERROR :",conditionMessage(e), "\n")
      if (conditionMessage(e) == "cannot open the connection") {
        stop("The table was likely opened during the download process and can't be used by the program. Please close the table and try again.")
      }
    })
  }
  
  # if there are any studies left in the associationsTable, append them to the output file
  if (nrow(associationsTable) > 0) {
    associationsTable <- formatAssociationsTable(associationsTable)
    appendToAssociationsTable(associationsTable)
  }
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}

DevPrint(paste("Traits with no valid snps:", length(invalidStudies)))
DevPrint(invalidStudies)
print(paste0("Data download and unpack complete! ", "took: ", format(Sys.time() - start_time)))