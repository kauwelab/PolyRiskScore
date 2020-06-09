#!/usr/bin/env Rscript

#TODO test output path
#TODO remove snps that have "(conditioned on rsid)" in their pvalue_description
#TODO argument: optional list of diseases to update
#TODO argument: optional list of studies to update
#TODO create shell script that automates the running of this script multiple times on different
  #sections of the GWAS catolog, making it faster to download data

#get args from the commandline- these are evaluated after imports section below
#variables:
#1. output folder
#2. path to chain file folder
#3. start trait index
#4. stop trait index
args = commandArgs(trailingOnly=TRUE)
if (length(args)==0) {
  args[1] <- "./association_tables/"
  args[2] <- "."
  args[3] <- 1
} else if (length(args)==1) {
  # default chain file path
  args[2] <- "."
  args[3] <- 1
} else if (length(args)==2) {
  args[3] <- 1
}

print("Initializing script!")
start_time <- Sys.time()

##imports and import downloads----------------------------------------------------------------------------------------------------------------------
my_packages <- c("BiocManager", "rtracklayer", "remotes", "gwasrapidd", "tidyverse", "rAltmetric", "magrittr", "purrr")                                  # Specify your packages
not_installed <- my_packages[!(my_packages %in% installed.packages()[ , "Package"])]              # Extract not installed packages
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
#----------------------------------------------------------------------------------------------

if (is_ebi_reachable()) {
  #evaulate command line arguments if supplied
  outPath <- args[1]
  chainFilePath <- args[2]
  startIndex <- as.numeric(args[3])
  stopIndex <- as.numeric(args[4])
  dir.create(file.path(outPath), showWarnings = FALSE)
  
  #the minimum number of SNPs a study must have to be valid and outputted
  minNumStudyAssociations <- 1
  
  #the paths to the chain files used for reference genome location conversions
  path38To19 = file.path(chainFilePath, "hg38ToHg19.over.chain")
  path19To18 = file.path(chainFilePath, "hg19ToHg18.over.chain")
  path19to17 = file.path(chainFilePath, "hg19ToHg17.over.chain")
  ch38To19 = import.chain(path38To19)
  ch19To18 = import.chain(path19To18)
  ch19To17 = import.chain(path19to17)
  
  ##functions-----------------------------------------------------------------------------------------
  
  #prints string by default unless isDev = FALSE: used for debugging
  DevPrint <- function(string, isDev = TRUE) {
    if (isDev) {
      print(string)
    }
  }
  
  #converts an tibble hg column to BED format (chrNum \t startIndex \t stopIndex)
  #if the hgCol has an NA, the resulting row in the tibble is returned as "chr1  -2  -1" 
  #so as to give an NA in the hgToHg method
  getBedFromCol <- function(hgCol) {
    bed <- tidyr::extract(hgCol, 1, into = c("chr", "start"), regex = "(\\d+):(\\d+)", convert = TRUE) %>%
      mutate(start = replace_na(start, -2)) %>%
      mutate(stop = as.numeric(start) + 1) %>%
      add_column(beginning = "chr") %>%
      unite(seqnames, c(beginning,chr), sep = "") %>% 
      mutate_if(is.character, str_replace_all, pattern = "chrNA", replacement = "chr1") #removes chrNA
    return(bed)
  }
  
  #converts given hg column to the second hg string type. Assumes firstHgCol's name is hg#
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
    #fills in rows that weren't able to be converted 
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
  
  ##------------------------------------------------------------------------------------------------------------------------
  
  #download trait data
  print("Downloading trait data!")
  traits <- get_traits()@traits
  print("Trait data downloaded!")
  #if no stopIndex was supplied, set it to the number of traits
  if (is.na(stopIndex)) {
    stopIndex <- nrow(traits)
  }
  
  invalidTraits <- c()
  invalidStudies <- c()
  
  DevPrint(paste0("Startup took ", format(Sys.time() - start_time)))
  DevPrint(paste0("Getting data from traits ", startIndex, " to ", stopIndex))
  #for each trait
  for (i in startIndex:stopIndex) {
    tryCatch({
      #starts a timer to time how long it takes to output this disease's results
      disease_time <- Sys.time()
      
      #gets the trait data, including all studies associated
      trait <- pull(traits[i, "trait"])
      trait <- str_replace_all(trait, "'", "'") #L�fgren's syndrome has a strange comma in it that we switch to the normal comma
      efo_id <- pull(traits[i, "efo_id"])
      efo_studies <- get_studies(efo_id = efo_id)
      efo_studies_tibble <- efo_studies@studies
      
      DevPrint(paste0(i, " of ", stopIndex, ": ", trait, "-", efo_id, " with ", nrow(efo_studies_tibble), " studies:"))
      
      if (nrow(efo_studies_tibble) <= 0) {
        DevPrint(paste0("  skipped- no studies for this trait!"))
        invalidTraits <- c(invalidTraits, trait)
        next
      }
      efo_publications <- efo_studies@publications
      efo_ancestral_groups <- efo_studies@ancestral_groups
      
      #initializes disease table for CSV data
      disease_table <- tibble()
      
      #for each study, get all its data
      for (j in 1:nrow(efo_studies_tibble)) {
        tryCatch({
          #get citation data (author + year published)
          citation <- paste(str_replace(pull(efo_publications[j, "author_fullname"]), "�", "o"), str_sub(pull(efo_publications[j, "publication_date"]), 1, 4))
          DevPrint(paste0("  ", j, ". ", citation))
          study_id <- pull(efo_studies_tibble[j, "study_id"])
          pubmed_id <- pull(efo_publications[j, "pubmed_id"])
          if (study_id %in% invalidStudies) {
            DevPrint(paste0("    skipping study bc not enough snps: ", citation, "-",study_id))
            next
          }
          variants <- get_variants(study_id = study_id)
          variants_tibble <- variants@variants
          genomic_contexts <- variants@genomic_contexts
          associations <- get_associations(study_id = study_id)
          associations_tibble <- associations@associations
          #gets single snps not part of haplotypes (remove group_by and filter to get all study snps)
          risk_alleles <- associations@risk_alleles %>%
            group_by(association_id) %>% 
            filter(dplyr::n()==1)
          
          master_variants <- full_join(genomic_contexts, variants_tibble, by = "variant_id") %>%
            dplyr::filter(!grepl('CHR_H', chromosome_name.x)) %>% #removes rows that contain "CHR_H" so that only numerical chrom names remain (these tend to be duplicates of numerically named chroms anyway)
            unite("gene", gene_name, distance, sep = ":") %>%
            mutate_if(is.character, str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% #removes NA:NA from columns that don't have a gene or distance
            group_by(variant_id) %>% 
            summarise_all(list(~toString(unique(na.omit(.))))) %>%
            mutate(gene = str_replace_all(gene, ", ", "|")) # separates each gene_name:distance pair by "|" instead of ", "
          master_variants[master_variants == ""] <- NA
          master_associations <- left_join(risk_alleles, associations_tibble, by = "association_id")
          study_table <- left_join(master_associations, master_variants, by = "variant_id") %>%
            unite("hg38", chromosome_name.x:chromosome_position.x, sep = ":", na.rm = FALSE) %>%
            mutate_at('hg38', str_replace_all, pattern = "NA:NA", replacement = NA_character_) %>% #if any chrom:pos are empty, puts NA instead
            tidyr::extract(range, into = c("lowerCI", "upperCI"),regex = "(\\d+.\\d+)-(\\d+.\\d+)") %>%
            add_column(citation = citation) %>%
            add_column(studyID = study_id, .after = "citation") #%>%
          #remove rows missing risk alleles or odds ratios, or which have X as their chromosome
          study_table <- filter(study_table, !is.na(risk_allele)&!is.na(or_per_copy_number)&startsWith(variant_id, "rs")&!startsWith(hg38, "X"))
          
          #if there are not enough snps left in the study table, add it to a list of ignored studies
          if (nrow(study_table) < minNumStudyAssociations) {
            invalidStudies <- c(invalidStudies, study_id)
          }
          #otherwise add the rows to the trait table
          else {
            disease_table <- bind_rows(study_table, disease_table)
          }
        }, error=function(e){cat("ERROR :",conditionMessage(e), "\n")})
      }
      
      if (nrow(disease_table) > 0) {
        #renames columns to names the database will understand
        disease_table <- ungroup(disease_table) %>%
          dplyr::rename(snp = variant_id,raf = risk_frequency, riskAllele = risk_allele, pValue = pvalue, oddsRatio = or_per_copy_number)
        #arranges the disease table by author, then studyID, then snpid. also adds a unique identifier column
        disease_table <- select(disease_table, c(snp, hg38, gene, raf, riskAllele, pValue, oddsRatio, lowerCI, upperCI, citation, studyID)) %>%
          arrange(citation, studyID, snp) %>%
          add_column(id = rownames(disease_table), .before = "snp")
      }
      if (nrow(disease_table) > 0) {
        #gets hg19, hg18, hg17 for the traits
        disease_table <- add_column(disease_table, hg19 = hgToHg(disease_table["hg38"], "hg19"), .after = "hg38")
        disease_table <- add_column(disease_table, hg18 = hgToHg(disease_table["hg19"], "hg18"), .after = "hg19")
        disease_table <- add_column(disease_table, hg17 = hgToHg(disease_table["hg19"], "hg17"), .after = "hg18")
        #writes out the data into CSVs at the outPath specified
        write.csv(disease_table, file.path(outPath, paste0(str_replace(trait, "/", "-"), ".csv")), row.names=FALSE) #"NK/T cell lymphoma" requires that we replace "/" with "-"
      }
      else {
        DevPrint(paste0("No valid SNPs for '", trait, "'!"))
        invalidTraits <- c(invalidTraits, trait)
      }
      print(paste0(trait, " complete! ", "took: ", format(Sys.time() - disease_time)))
      print(paste0("Time elapsed: ", format(Sys.time() - start_time)))
    }, error=function(e){cat("ERROR :",conditionMessage(e), "\n")})
  }
  DevPrint("Traits with no valid snps:")
  DevPrint(invalidTraits)

} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}