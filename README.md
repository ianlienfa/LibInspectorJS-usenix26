# Setup this directory

1. Setup different modules respectively
    ```
    cd JAW4C-JAW && ./install.sh    
    ```

# Running the full pipeline (including setting up DB/archive)
```
source ./env.sh -d
```
This should be executed in the JAW4C-JAW directory, it will set up the python environment and the required docker services 
```
python3 -m run_pipeline --conf=config.yaml
```
For simple testing
```
python3 -m analyses.example.example_analysis --input=<path to the testing script> -S ""
```

# Changing configurations
The pipeline configuration is in JAW4C-JAW/config.yaml

# Manual setup

### Web archive setup
- generating the right url to interact with the archive- use the `create_start_crawl_url` function in README.md
    ```
    cd JAW4C-WebArchive/ && docker build -t mitmproxy . && docker run -it --rm -p 8001:8001 -p 8002:8002 -p 8314:8314 -p 8315:8315 -p 8316:8316 --entrypoint=bash -v "$(pwd)/archive/archive-70":/proxy/archive-70  mitmproxy
    ```
    Then in the container:
    ```
    mkdir proxy_logs
    echo "Launching proxy instance 8002"
    mitmdump \
    --listen-host=0.0.0.0 \
    --listen-port=8002 \
    --set confdir=./conf \
    --set flow-detail=0 \
    --set anticache=true \
    --set anticomp=true \
    -s "./scripts/proxy.py" \
    --set useCache=true \
    --set onlyUseCache=false \
    --set useBabel=true \
    --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
    --set warcPath="/proxy/archive-70" \
    --set replayNearest=true \
    --set replay=true \
    --set archive=false \
    --set append=false \
    > "proxy_logs/out" 2> "proxy_logs/err"
    ```
    ```
    # Example testing command 
    curl -v --proxy http://localhost:8002 http://240.240.240.240/\?target\=https%3A%2F%2Fwww.google.com.pr%2Fimghp%3Fhl%3Den%26ogbl\&type\=soak
    ```
    - If you see http response code 301, then the archive is working correctly

### Vuln-DB setup
Build db instance
```
docker compose up --build
```
Interacting with Vuln-DB
```
docker exec -it vulndb psql -U vulndb -d vulndb
```
If you want to connect via psql, the config is:
```
host=localhost
database=vulndb
username=vulndb
password=vulndb_pwd
port=543
```

# Commonly seen problems
- 'Failed to launch the browser process!': remember to source env.sh
- Archive stuck at:
    ```* Host localhost:8002 was resolved.
    * IPv6: ::1
    * IPv4: 127.0.0.1
    *   Trying [::1]:8002...
    * Connected to localhost (::1) port 8002
    > GET http://240.240.240.240/?target=https%3A%2F%2Fwww.us.jll.com%2Fen%2Fsolutions%2Frelocation-project-management%3Fhighlight%3Doccupier-services&type=soak HTTP/1.1
    > Host: 240.240.240.240
    > User-Agent: curl/8.5.0
    > Accept: */*
    ```
    -> Check the correctness of url
- no permission to database data
    - add current user to group 7474 (the group number that is used to create docker database)
    - if there's no group 7474, create one
    ```

    ```