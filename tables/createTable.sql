SET @query = CONCAT('CREATE TABLE ', @tblName, ' ( id smallint unsigned not null, snp varchar(20), hg38 varchar(50), hg19 varchar(50), hg18 varchar(50), hg17 varchar(50), gene varchar(50), ethnicity varchar(100), raf float, riskAllele varchar(20), pValue double, oddsRatio float, lowerCI float, upperCI float, seLnOR double, study varchar(50), cohort double, citations double)');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/* this will allow us to create tables without needing to 
type out the columns each time. To run this to create the 
table you want, login to mysql and then run the command:
SET @tblName = 'nameYouWantForTable'; \. createTable.sql
*/
