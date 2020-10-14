# PRSKB

The Polygenic Risk Score Knowledge Base is a website and command-line interface designed to facilitate the calculation of polygenic risk scores using genome-wide association studies from the [NHGRI-EBI Catalog](https://www.ebi.ac.uk/gwas). 

## Website

Blurb about the website
Website Link: [https://prs.byu.edu](https://prs.byu.edu)

## Command-Line Interface

The command-line interface (CLI) allows users to run larger analyses straight from their command-line. In addition to this, the tool comes with an interactive menu for searching studies and traits in our database and learning more about tool parameters. 

[Download CLI](https://prs.byu.edu/download_cli)
Required installed programs: Bash, Python3

## CLI Example



## Citing this work



## Acknowledgements

<!-- ## Loading a Table into MySQL

1. Make sure you have the necessary files in lsprs.
If you haven't added them to the github, do so now. Once added, follow the directions for re-uploading the repository
to the server. 

2. CD into /home/var/www/prs.byu.edu/html/tables

3. Log in
```console
mysql -u polyscore -p --local-infile polyscore
```

4. Switch to the polyscore database. 
```sql
USE polyscore;
```

5. OPTIONAL: If you already have a table for the trait and want to replace it, first drop the table.
```sql 
DROP TABLE t2d;
```

6. Create the new table. Run the following command to create a table with the standard columns:
```sql
SET @tblName = 'nameYouWantForTable'; \. createTable.sql
```

7. Load the data into the table. If your csv file is not located in the same directory that you were in when you logged into mysql, then pass in the full file path.

```sql 
LOAD DATA LOCAL INFILE 't2d.csv' INTO TABLE t2d COLUMNS TERMINATED BY ',' LINES TERMINATED BY '\n' IGNORE 1 LINES;
```

8. Check whether it's been loaded correctly using code such as 
```sql
SELECT * FROM t2d; 
SELECT * FROM t2d WHERE study='Lambert 2013 etc.';
```

### Replacing a String:

This code would get rid of an extra \r character in the study column
```sql
UPDATE hf 
SET study = REPLACE(study, '\r', '');
```
 -->
