#!/bin/bash

#Submit this script with: sbatch thefilename

#SBATCH --time=1:00:00  # walltime
#SBATCH --ntasks=1  # number of processor cores (i.e. tasks)
#SBATCH --nodes=1  # number of nodes
#SBATCH --mem=60G  # memory CPU core
#SBATCH -J "Clump database"
#SBATCH --mail-user=elizabethvance03@gmail.com   # email address
#SBATCH --mail-type=BEGIN
#SBATCH --mail-type=END
#SBATCH --mail-type=FAIL

PLINK_BIN=/fslhome/evance3/fsl_groups/fslg_KauweLab/compute/src/plink-1.9/plink

for filename in "$1"/*; do
  python3 create_assoc_file.py "$filename"
  $PLINK_BIN --bfile /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/populations/african/africa_filt --clump /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/temp.csv --clump-p1 1 --clump-p2 1 --clump-r2 0.1 --out ./final_clumps/"${filename%.*}"_african_clump 
  $PLINK_BIN --bfile /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/populations/american/american_filt --clump /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/temp.csv --clump-p1 1 --clump-p2 1 --clump-r2 0.1 --out ./final_clumps/"${filename%.*}"_american_clump
  $PLINK_BIN --bfile /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/populations/east_asian/east_asia_filt --clump /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/temp.csv --clump-p1 1 --clump-p2 1 --clump-r2 0.1 --out ./final_clumps/"${filename%.*}"_eastAsian_clump
  $PLINK_BIN --bfile /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/populations/european/european_filt --clump /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/temp.csv --clump-p1 1 --clump-p2 1 --clump-r2 0.1 --out ./final_clumps/"${filename%.*}"_european_clump
  $PLINK_BIN --bfile /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/populations/south_asian/south_asia_filt --clump /fslhome/evance3/fsl_groups/fslg_polygenicScore/compute/PolyRiskScore/tables/clumping/temp.csv --clump-p1 1 --clump-p2 1 --clump-r2 0.1 --out ./final_clumps/"${filename%.*}"_southAsian_clump
 # python3 ./1000_GENOMES_VCF/SCRIPTS/LD_CLUMPING/parse_clumps_toDB.py "$2" african_temp.clumped american_temp.clumped eastAsian_temp.clumped european_temp.clumped southAsian_temp.clumped temp.csv
done

#TODO: delete temp files/folders
rm temp.csv

