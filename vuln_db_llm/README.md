# Setup docker container
```
# first time 
docker compose up postgres
```

# Table at
```
HOST: localhost
PORT: 5430
USER: vulndb_annotated
PASSWORD: vulndb_pwd
DB: vulndb_annotated
TABLE: advisories_annotated
```

# Testing command
```
SELECT *
FROM public.advisories_exploits 
WHERE doc @> '{"aliases": ["CVE-2018-7212"]}';
```
