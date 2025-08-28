# Setup docker container
```
# first time 
docker compose up --build 
```
The python importer expect to see a advisories.zip file in this directory, it will automatically import the database file 

# Testing command
```
SELECT *
FROM advisories_raw
WHERE doc @> '{"aliases": ["CVE-2018-7212"]}';
```

# To get updated advisories.csv, mount a share volume
```
docker exec -it vulndb psql -U vulndb -d vulndb
```
```
\copy advisories_raw TO '/app/share/advisories_raw.csv' WITH (FORMAT csv, HEADER, FORCE_QUOTE *);
```

