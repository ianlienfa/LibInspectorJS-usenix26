# You Import, They Exploit: Measuring JavaScript Library Exploitability on the Web

This artifact evaluates LibInspectorJS, a scalable pipeline that measures the vulnerable library functions and exploitability on the web. 


# Overview

JavaScript libraries such as jQuery and Lodash are a core
component of the modern web development stack. However,
prior work has shown that websites frequently rely on out-
dated libraries, many of which contain publicly known vul-
nerabilities. LibInspectorJS is a end-to-end pipeline that: (i) detects
vulnerable libraries, including in bundled code, by lifting
and analyzing them for identifying features; (ii) pinpoints
exploitable functions using a new tag-tainting algorithm to
match non-standard sinks; and (iii) evaluates exploitability
through automated data-flow analysis from user-controlled in-
puts.


# Running the full pipeline (including setting up DB/archive)
```
docker compose -p 'artifact' up --build
```
This should be executed in the JAW4C directory, it will set up the python environment and the required docker services 

Once the docker services are up, you can control the pipeline execution by exec into the logic container

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
    mkdir -p proxy_logs
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
    --set warcPath="/proxy/archive-dec24" \
    --set replayNearest=true \
    --set replay=true \
    --set archive=false \
    --set append=false \
    > "proxy_logs/out" 2> "proxy_logs/err"
    ```
    ```
    # Example testing command 
    curl -v --proxy http://localhost:8002 http://240.240.240.240/?target=https%3A%2F%2Fwww.google.com&type=soak
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

# Verification step
The ground truth collection is saved in groundtruth.json in each webpage's folder

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
- neo4j connection problem
    - could be previous container didn't stop gracefully and therefore some lock is helded by the operating system, the proper way to fix this is to remove the /var/lib/neo4j/data/databases/store_lock (now implemented into create_container)

    ```

# Docker testing
- When testing pipeline using docker_keep_alive option, manually clean up the instances with
```
docker ps -a | grep 'arm64v8/neo4j:4.4' | cut -f 1 -d ' ' | while read id; do python3 -c "import docker.neo4j.manage_container as c; c.stop_neo4j_container('${id}')" && docker rm $id done
```