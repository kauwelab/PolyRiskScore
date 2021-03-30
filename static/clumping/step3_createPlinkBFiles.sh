#!/bin/bash

# $PLINK_BIN = path to plink source code
# $1 = path to VCF file (should include all chromosomes and be specifice to a population and reference genome)
# $2 = base name for output file set (should probabyl include population and reference genome)

$PLINK_BIN --vcf "$1" --vcf-half-call 'm' --make-bed --out "$2" 
