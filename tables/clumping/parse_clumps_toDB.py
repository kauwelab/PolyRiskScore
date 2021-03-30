import mysql.connector
from mysql.connector import errorcode
from mysql.connector.constants import ClientFlag
from pyliftover import LiftOver
import sys

def getConnection(config):
  try:
    connection = mysql.connector.connect(**config)
    connection.autocommit = True
  except mysql.connector.Error as err:
    if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
      print("Something is wrong with your user name or password")
    elif err.errno == errorcode.ER_BAD_DB_ERROR:
      print("Database does not exist")
    else:
      print("else")
      print(err)
  else:
    print("in connection")
    return connection


def main():
    
  #TODO: password argument
  # Connect to the Polyscore Database
  config = {
           'user': 'polyscore',
           'password': sys.argv[1],
           'host': 'localhost',
           'database': 'polyscore',
           'allow_local_infile': True,
           'auth_plugin': 'mysql_native_password',
    }
  connection = getConnection(config)
  mycursor = connection.cursor()

  #TODO: Create the clumps table
  #TODO: Add Trait Column
  mycursor.execute("CREATE TABLE [IF NOT EXISTS] clumps (studyID VARCHAR (30), trait VARCHAR (40), snp VARCHAR (20), hg38_pos VARCHAR (30), african_clump INT, american_clump INT, eastAsian_clump INT, european_clump INT, southAsian_clump INT)")


  # Read in the plink.clumped files (one for each of the 5 super populations)
  africanClumped = open(sys.argv[2], 'r')
  americanClumped = open(sys.argv[3], 'r')
  eastAsianClumped = open(sys.argv[4], 'r')
  europeanClumped = open(sys.argv[5], 'r')
  southAsianClumped = open(sys.argv[6], 'r')

  # Read in the .assoc gwas file
  gwasFile = open(sys.argv[7], 'r')

  # Get all of the lines from the .clumped files
  clumpedFilesLines = []
  africanLines = africanClumped.readlines()
  americanLines = americanClumped.readlines()
  eastAsianLines = eastAsianClumped.readlines()
  europeanLines = europeanClumped.readlines()
  southAsianLines = southAsianClumped.readlines()
  clumpedFilesLines.append(africanLines)
  clumpedFilesLines.append(americanLines)
  clumpedFilesLines.append(eastAsianLines)
  clumpedFilesLines.append(europeanLines)
  clumpedFilesLines.append(southAsianLines)

  # Get all of the lines from the .assoc gwas file
  gwasLines = gwasFile.readlines()

  # Create a map from the gwas file that has the snps as the keys and the chromPos as the values
  snp_chromPos_map = {}


  # Iterate through the gwas file lines and grab the snps, chromPos, pvalue, and studyID
  lo = LiftOver('hg19', 'hg38')
  for line in gwasLines[1:]:
    line = line.strip()
    tabs = line.split('\t')
    snp = tabs[0]
    chrom = tabs[1]
    chrom_string = 'chr' + chrom
    pos = float(tabs[2])
    hg38_chromPos = lo.convert_coordinate(chrom_string, pos)
    pvalue = tabs[4]
    study = tabs[6]
    chrom = hg38_chromPos[0][0].replace('chr','')
    pos = hg38_chromPos[0][1]
    chromPos = str(chrom) + ':' + str(pos)
    snp_chromPos_map[snp] = chromPos

  

  # Create a counter for the population files
  popNum = 0

  # Loop through each of the population file lines
  for lines in clumpedFilesLines:
    # Create a counter for the clump line
    clumpNum = 0 
    # Loop through each of the lines (each line represents a clump)
    for line in lines[1:]:
      # Check to make sure the line isn't blank
      if line.strip():
        # Remove trailing white space and then split the line by white space
        line=line.strip()
        tabs = line.split()
        # The 11th "tab" holds the list of snps that are in the clump but aren't the index snp
        clump = tabs[11]
        # The 2nd "tab" holds the index snp
        index = tabs[2]
        # Split the clump column by the comma in order to create a list of the snps
        snps = clump.split(',')
        # Add the index snp to this list
        snps.append(index) 
	# Iterate through each snp in the clump
        for snp in snps:
          if snp != "NONE":
            snp_revised = snp.replace('(1)','')
            chromPos = snp_chromPos_map[snp_revised]
            if popNum == 0:
              snp_african_map[snp] = num
            elif popNum == 1:
              snp_american_map[snp] = num
            elif popNum == 2:
              snp_eastAsian_map[snp] = num
            elif popNum == 3:
              snp_european_map[snp] = num
            elif popNum == 4:
              snp_european_map[snp] = num
      clumpNum += 1
    popNum += 1


  # Iterate through the snps listed in the gwas file and add the necessary info to the clump table
  for snp in snp_chromPos_map:
    add_snp = ("INSERT INTO clumps "
              "(StudyID, SNP, hg38_pos, African_Clump, American_Clump, EastAsian_Clump, European_Clump, SouthAsian_Clump) "
              "VALUES (%s, %s, %s, %s, %s")
    data_snp = (study, snp, snp_chromPos_map[snp], snp_african_map[snp], snp_american_map[snp], snp_eastAsian_map[snp], snp_european_map[snp], snp_southAsian_map[snp])
    # Insert the study snp into the clumps table
    mycursor.execute(add_snp, data_snp)
    # Commit the data to the database
    connection.commit()


  mycursor.close()
  connection.close()

main()
