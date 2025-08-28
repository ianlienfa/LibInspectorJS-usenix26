# Setup docker container
```
# first time 
docker compose up postgres 
docker compose run --rm importer       # run importer once, remove when done
```

# Testing command
```
SELECT *
FROM advisories_raw
WHERE doc @> '{"aliases": ["CVE-2018-7212"]}';
```
