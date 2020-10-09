#!/usr/bin/env Rscript

# This script downloads all the studies from the GWAS catalog using the gwasrapidd library and puts it into a temporary CSV.
# The "unpackDatabaseCommandLine.R" script can then read the studies here and get the data associated with each study.

# How to run: Rscript downloadStudiesToFile.R "studyDataFolderPath"
# where: "studyDataFolderPath" is the path to the studyData folder where the studyData CSV will be output. (default: "./").

# get args from the commandline- these are evaluated after imports section below
args = commandArgs(trailingOnly=TRUE)
if (length(args)==0) {
  args[1] <- "./"
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
  # download study data
  print("Downloading study data!")
  studies <- get_studies(interactive = FALSE)
  studiesTibble <- studies@studies
  # get publication data for all the studies
  publications <- studies@publications
  print("Study data downloaded!")
  studyFilePath = file.path(args[1], "rawGWASStudyData.tsv")
  write_tsv(studiesTibble, studyFilePath)
  publicationsFilePath = file.path(args[1], "rawGWASPublications.tsv")
  write_tsv(publications, publicationsFilePath)
  print(paste0("Study data printed to: ", args[1]))
} else {
  is_ebi_reachable(chatty = TRUE)
  stop("The EBI API is unreachable. Check internet connection and try again.", call.=FALSE)
}
