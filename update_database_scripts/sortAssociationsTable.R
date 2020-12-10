# This script orders a preexisting associations_table so that studyIDs are ordered and then SNPs. After ordering, adds an id 
# column starting at 1 and incrementing by 1 for every new row.

# How to run: Rscript orderAssociations.R "associationTableFolderPath"
# where "associationTableFolderPath" is the path to the folder where the association table TSV is stored (default: "../tables/")

# get args from the commandline
args = commandArgs(trailingOnly=TRUE)
if (length(args)==0) {
  args[1] <- "../tables/"
}

## imports ----------------------------------------------------------------------------------------------------------------------
suppressMessages(library(tidyverse))
#----------------------------------------------------------------------------------------------


associationTablePath <- file.path(args[1], "associations_table.tsv")
associationsTibble <- read_tsv(associationTablePath, col_types = cols(.default = col_guess(), hg38 = col_character(), hg19 = col_character(), hg18 = col_character(), hg17 = col_character(), sex = col_character()))

# if the id column already exists, remove it for sorting purposes
if (names(associationsTibble)[1] == "id") {
  associationsTibble <- select(associationsTibble, -id)
}

# sort the table by trait, then citation, then snp
associationsTibble <- arrange(associationsTibble, trait, citation, snp) %>%
  tibble::rowid_to_column("id")

write_tsv(associationsTibble, associationTablePath, append = FALSE)
