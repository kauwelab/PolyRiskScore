SET @query = CONCAT('CREATE TABLE ', @tblName, ' ( id smallint unsigned not null, snp varchar(20), chromosome tinyint,  hg38 int, hg19 int, hg18 int, hg17 int, raf float, riskAllele varchar(20), pValue double, oddsRatio float, lowerCI float, upperCI float, study varchar(50), ethnicity varchar(50))');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* this will allow us to create tables without needing to 
type out the columns each time. To run this to create the 
table you want, login to mysql and then run the command:
SET @tblName = 'nameYouWantForTable'; \. createTable.sql
*/
