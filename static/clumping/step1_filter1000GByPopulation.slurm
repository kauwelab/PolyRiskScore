#!/bin/bash

# $1 = path to folder with the 1000 Genomes vcf files (separated by chromosome)
# $2 = path to file with list of sample names for the population in question
# $3 = path to output folder
# $4 = name of population (in order to label the output file)
  
for file in "$1"/*.vcf.gz; do
  bcftools view -Oz -S "$2" "$file" > "$3"/"$4"_$(basename "$file")
done
exit 0
