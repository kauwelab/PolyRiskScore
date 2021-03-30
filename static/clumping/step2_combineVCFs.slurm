#!/bin/bash

# $1 = path to file with VCF files for each chromosome (should be sorted by population and reference genome)
# $2 = population name (in order to label the output file)
# $3 = reference genome (in order to label the output file)

bcftools concat -Oz "$1"/* > "$2"_total_chroms_"$3".vcf.gz
exit 0
