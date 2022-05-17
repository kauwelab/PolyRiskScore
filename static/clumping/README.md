# PRSKB Linkage Disequilibrium Clump Files

In this directory, there are 12 scripts used to create the population-specific linkage disequilibrium (LD) regions and upload the correctly formatted files to the PRKSB database.

These steps were performed by the PRSKB developers and do not need to be run by PRSKB users. We include them here for informational purposes and reproducibility.

Necessary tools:
- Bash
- Python
- PLINK

Run the files in sequential order (steps 1-12):

## Step 1: Filter 1000 Genomes by Population

File: "step1_filter1000GByPopulation.sh"

This step will filter each of the 1000 Genomes chromosome VCF files by the indicated super population. This step will need to be ran once for each super population (African, American, European, East Asian, South Asian). 

The following are the required input parameters: 
1. Path to the directory containing the 1000 Genomes vcf files (separated by chromosome)
2. Path to a file with the list of sample names part of the indicated super population
3. Path to desired output folder
4. Name of super population

```
bash ./step1_filter1000GByPopulation.sh <pathTo1000GFiles> <pathToSamplesInPopulation> <pathToOutputFolder> <populationName>
```
After running this code for each super population, you should have a directory that holds the filtered VCF files for each super population.


## Step 2: Combine VCFs

This step will combine the individual chromosome VCFs into a single VCF file. This step will need to be run once for each super population and desired reference genome.

Required input parameters:
1. Path to directory with chromosome VCF files (the output folder created in step 1). 
2. Name of super population
3. Reference genome (used to label the output file)

```
bash ./step2_combineVCFs.sh <pathToVCFfiles> <populationName> <referenceGenome>
```
After running this code for each super population, you should have a single VCF file for each super population and desired reference genome.


## Step 3: Create Plink Bfiles

This step will create the necessary PLINK binary files and will need to be run for each super population and desired reference genome.

Required input parameters:
1. Path to population-filtered VCF file (created in step 2)
2. Output file set basename (should include the population and reference genome)

```
bash ./step3_createPlinkBFiles.sh <pathtoVCF> <outputName>
```

## Step 4: Exclude Duplicates

This step will exclude duplicate variants in the VCF file. It should be run for each super population and reference genome.

Required input parameters:
1. Path to .bim file (created in step 3)
2. Path to an arbitrary intermediate file that will include duplicates
3. Basename of PLINK binary fileset (the same basename used in step 3)
4. Output basename for newly filtered PLINK binary fileset (e.g. african_hg19_dupsRemoved)

```
bash ./step4_excludeDups.sh <pathToBim> <tempFile> <plinkBaseName> <outputBaseName>
```

## Step 5: Create Flat Files

This step will convert the PLINK binary files into readable flat files. This step must be run for each super population and desired reference genome.

Required input parameters:
1. Basename of PLINK binary fileset with duplicates removed (created in step 4)
2. Output basename for flat fileset (this can be the same as parameter #1)

```
bash ./step5_createFlatFiles.sh <basenamePLINKBinary> <basenameOutputFlatFiles>
```

## Step 6: Split Map File by Chromosome

This step will split the .map file by chromosome. This step should be run for each super population and desired reference genome.

Required input parameters:
1. Path to .map file

```
bash ./step6_splitMapByChrom <mapFile>
```

The output will be a .map file for each chromosome.

## Step 7: Create Association File

This step creates a necessary association file used for the LD clumping process. This step should be run for each population and desired reference genome.

Required input parameters:
1. Path to directory with map files split by chromosome (created in step 6)
2. Path to new output directory
3. Population name (used to label output file)
4. Reference genome (used to label output file)

```
bash ./step7_createAssociationFiles.sh <pathToMapFilesFolder> <pathToOutputFolder> <population> <referenceGenome>
```

The output folder should contain an association file for each chromosome.

## Step 8: Perform LD Clumping

This step performs the LD clumping procedure. For each super population and desired reference genome, this script will need to be run for each chromosome.

Required input parameters:
1. Path to directory with PLINK binary fileset with duplicates excluded (created in step 4)
2. Basename of PLINK binary fileset
3. Path to association file for the indicated chromsome
4. Path to output folder
5. Population name
6. Reference genome
7. Chromsome number

```
bash ./step8_LDClump.sh <pathToPLINKbinaryFileset> <binaryBasename> <pathToAssociationFile> <pathToOutputFolder> <population> <referenceGenome> <chromsomeNumber>
```
The output should be a .clumped file for the super population, reference genome, and chromosome.

## Step 9: Combine Clumped Files

This step will combine the individual chromosome .clumped files and should be run for each super population and reference genome.

Required input parameters:
1. Path to directory with clumped files (created in step 8)
2. Path to output directory
3. Population name
4. Reference genome

```
bash ./step9_combineClumpedFiles.sh <pathToClumpedFiles> <pathToOutputDir> <population> <referenceGenome>
```

The output should be a single .clumped file for the super population and desired reference genome.

## Step 10: Create Database CSV File

This step will format the .clumped file so that it's compatible with the PRSKB and will need to be run for any desired reference genome.

Required input parameters:
1. .map file (specific to the population and reference genome, created in step 5)
2. - 6. Path to each of the combined .clumped files (AFR, AMR, EAS, EUR, SAS) craeted in step 9
7. Path to output CSV file

```
python step10_createDatabaseCSV.py <mapFile> <afr_clumped> <amr_clumped> <eas_clumped> <eur_clumped> <sas_clumped> <outputCSV>
```

## Step 10 (alt): Create Database CSV Using Liftover

If you want to convert your clumped files to a different reference genome using Liftover (rather than running all the steps over again with VCFs from a different reference genome), use this script for step 10 instead.

Required input parameters:
1. .map file (specific to the population and reference genome, created in step 5)
2. - 6. Path to each of the combined .clumped files (AFR, AMR, EAS, EUR, SAS) craeted in step 9
7. Path to output CSV file
8. Target reference genome  (we converted HG19 varaints to HG17 and HG18) 

```
python step10_createDatabaseCSV.py <mapFile> <afr_clumped> <amr_clumped> <eas_clumped> <eur_clumped> <sas_clumped> <outputCSV> <targetRefGen>
```

## Step 11: Upload CSV to Database

This step uploads the CSV to the PRSKB database

Required input parameters:
1. Database password
2. Intended database table name
3. Path to CSV file (created in step 10)

```
python step11_uploadCSVToDatabase.py <password> <tableName> <pathToCSVFile>
```
