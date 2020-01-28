#Loading a Table into MySQL

1. Make sure you have the necessary files in lsprs.
```console
scp t2d.csv yourbyuid@lsprs:/home/byu.local/yourbyuid
```

2. Log in
```console
mysql -u polyscore -p --local-infile polyscore
```

3. Switch to the polyscore database. 
```sql
USE polyscore;
```

4. OPTIONAL: If you already have a table for the disease and want to replace it, first drop the table.
```sql 
DROP TABLE t2d;
```

5. Create the new table. The specified columns will be slightly different once we add gene, impact factor, and study size columns to each table. Please update the README once there is a standard table format. 
```sql
CREATE TABLE t2d ( id smallint unsigned not null, snp varchar(20), chromosome tinyint,  hg38 int, hg19 int, hg18 int, hg17 int, raf float, riskAllele varchar(20), pValue double, oddsRatio float, lowerCI float, upperCI float, study varchar(50), ethnicity varchar(50));
```

6. Load the data into the table. If your csv file is not located in the same directory that you were in when you logged into mysql, then pass in the full file path. The code below should solve the previous problem of having a rogue /r at the end of the study column. 

```sql 
LOAD DATA LOCAL INFILE 't2d.csv' INTO TABLE t2d COLUMNS TERMINATED BY ',' LINES TERMINATED BY '\r\n' IGNORE 1 LINES;
```

7. Check whether it's been loaded correctly using code such as 
```sql
SELECT * FROM t2d; 
SELECT * FROM t2d WHERE study='Lambert 2013 etc.';
```

#Replacing a String:

This code would get rid of an extra \r character in the study column
```sql
UPDATE hf 
SET study = REPLACE(study, '\r', '');
```

