#!/bin/bash

# $PLINK_BIN = path to plink source code
# $1 = path to directory with binary file set (filtered to exclude duplicates)
# $2 = basename of binary file set
# $3 = path to association file
# $4 = path to output folder
# $5 = population (used to label output)
# $6 = reference genome (used to label output)
# $7 = chromosome number (used to label output)

$PLINK_BIN --bfile ${1}${2} --clump "$3" --clump-p1 1 --clump-p2 1 --clump-r2 0.25 --clump-kb 500 --out ${4}${5}_${6}_general_clumps_chr${7}
