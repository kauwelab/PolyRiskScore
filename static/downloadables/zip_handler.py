#TODO remove sys
import sys
import zipfile
import tarfile

def isValidZippedFile(filePath):
    if zipfile.is_zipfile(filePath):
        print("is zip")
        archive = zipfile.ZipFile(filePath, "r")
        validArchive = []
        for filename in archive.namelist():
            if filename[-4:] == ".vcf" or filename[-4:] == ".txt":
                validArchive.append(filename)
        if len(validArchive) == 1:
            print(True)
            return True
            # raise ValueError("There must be 1 vcf/txt file in the zipped file. Please check your input file and try again.")
    elif tarfile.is_tarfile(filePath):
        #TODO
        print("is tar")
        archive = tarfile.TarFile(filePath, "r")
        validArchive = []
        for tarInfo in archive.getmembers():
            print(tarInfo.name)
            # if tarInfo.name[-4:] == ".vcf" or tarInfo.name[-4:] == ".txt":
            #     validArchive.append(tarInfo.name)
        if len(validArchive) == 1:
            print(True)
            return True
    print(False)
    return False

filePath = sys.argv[1]
print(isValidZippedFile(filePath))