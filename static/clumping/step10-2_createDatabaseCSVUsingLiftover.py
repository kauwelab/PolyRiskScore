from pyliftover import LiftOver
import sys
import csv 

# $1 = path to .map file (specific to a certain population and reference genome) created in step 5
# $2-$6 = path to each combined .clumped files (AFR, AMR, EAS, EUR, SAS) created in step 9
# $7 = output file path
# $8 = target reference genome (we convert hg19 variants to hg17 or hg18)


def getPosMap():
    print("creating position map")
    mapFile = open(sys.argv[1], 'r')
    posMap = {}
    lo = LiftOver('hg19', sys.argv[8])
    for line in mapFile:
        line = line.strip()
        values = line.split()
        chrom = "chr" + str(values[0])
        pos = values[3]
        liftOverObj = lo.convert_coordinate(chrom, int(pos))
        snp = values[1]
        if liftOverObj != None and liftOverObj != []:
                newPos = liftOverObj[0][1]
                chromPos = str(values[0]) + ":" + str(newPos)
                posMap[snp] = chromPos
    print("map created")
    return posMap

def executeLine(line, count, snp_pos_map, row_map, colNum):
    if line is not None and any(x.strip() for x in line):
        line = line.strip()
        values = line.split()
        index = values[2]
        snps2 = values[11].split(',')
        if index in snp_pos_map:
                pos = snp_pos_map[index]
    else:
        pos = "NA"
    if index in row_map:
        rowLine = row_map[index]
    else:
        rowLine = [index, pos]
        for num in range(0,colNum):
            rowLine.append("NA")
            

    rowLine.append(count)
    row_map[index] = rowLine
        for snp in snps2:
            if snp != None and snp != 'NONE':
                snp = snp.replace('(1)', '')
        if snp in snp_pos_map:
            pos = snp_pos_map[snp]
        else:
            pos = 'NA'
        if snp in row_map:
            rowLine = row_map[snp]
        else:
            print("snp isn't already in the row map")
            rowLine = [snp, pos]
            print(colNum)
            for num in range(0,colNum):
                print("previous columns")
                print(num)
                rowLine.append("NA")
            
        rowLine.append(count)
        row_map[snp] = rowLine
    return row_map


def executeLineAfrican(line, count, snp_pos_map):
    row_map = {}
    if line is not None and any(x.strip() for x in line):
        line = line.strip()
        values = line.split()
        index = values[2]
        if index in snp_pos_map:
            index_pos = snp_pos_map[index]
        else:
            index_pos = "NA"
        snps2 = values[11].split(',')
    newLine = [index, index_pos, count]
    row_map[index] = newLine
        for snp in snps2:
            if snp != None and snp != 'NONE':
                snp = snp.replace('(1)', '')
                if snp in snp_pos_map:
                    snp_pos = snp_pos_map[snp]
                else:
                    snp_pos = "NA"
        newLine = [snp, snp_pos, count]
        row_map[snp] = newLine
    return row_map

def writeToCSV(row_map):
    header = ['snp', 'position', 'african_clump', 'american_clump', 'eastAsian_clump', 'european_clump', 'southAsian_clump']
    with open(sys.argv[7], 'w') as f:
        output = csv.writer(f)
        output.writerow(header)
        for line in row_map.values():
            if len(line) < 7:
                for i in range(0, (7-len(line))):
                    line.append("NA")
            output.writerow(line)

def parseClumps(snp_pos_map):
    
    print("in parse clumps")
    # loop through each clump file
    count = 0
    africanClumps = open(sys.argv[2], 'r')
    for line in africanClumps:
        row_map = executeLineAfrican(line, count, snp_pos_map)
        count += 1
    print("finished african clumps")
    africanClumps.close()

    colNum = 1
    count = 0
    americanClumps = open(sys.argv[3], 'r')
    for line in americanClumps:
        row_map = executeLine(line, count, snp_pos_map, row_map, colNum)
        count += 1
    print("finished american clumps")
    americanClumps.close()

    colNum += 1
    count = 0
    eastAsianClumps = open(sys.argv[4], 'r')
    for line in eastAsianClumps:
        row_map = executeLine(line, count, snp_pos_map, row_map, colNum)
        count += 1
    print("finished ea clumps")
    eastAsianClumps.close()
    
    colNum += 1
    count = 0
    europeanClumps = open(sys.argv[5], 'r')
    for line in europeanClumps:
        row_map = executeLine(line, count, snp_pos_map, row_map, colNum)
        count += 1
    print("finished eu clumps")
    europeanClumps.close()
    
    colNum += 1
    count = 0
    southAsianClumps = open(sys.argv[6], 'r')
    for line in southAsianClumps:
        row_map = executeLine(line, count, snp_pos_map, row_map, colNum)
        count += 1
    print("finished sa clumps")
    southAsianClumps.close()

    return row_map

        

def main():
        
    # Open the association file and create a map that has the snp as key and position as value
    snp_pos_map = getPosMap()
    
    # open .clumped files
    row_map = parseClumps(snp_pos_map)

    writeToCSV(row_map)


main()
