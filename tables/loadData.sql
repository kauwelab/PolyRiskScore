SET @query = CONCAT('LOAD DATA LOCAL INFILE "', @fileName,'" INTO TABLE ', @tblName, ' COLUMNS TERMINATED BY "," LINES TERMINATED BY "\r\n" IGNORE 1 LINES;');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* this will allow us to fill tables with data from csv files.
To run this to fill the table you want with data, login to mysql 
and then run the command:
SET @fileName = 'nameOfFile.csv'; SET @tblName = 'nameYouWantForTable'; \. loadData.sql
*/
