# Setup this directory

1. Setup different modules respectively
    - CVE_JAW requires running ./install.sh, setting up python environment (venv recommended) and run `pip install -r requiremenet.txt`
    - Webarchive requires building its own docker image

2. Start testing (CVE_JAW)
    ```
    python3 -m analyses.example.example_analysis --input=/home/ian/BundlerResearch/CVE-JAW/data/test_program/test.js -S ""
    ```
    There might be some permission problems, try setting the directory permision bits to be 777

    ```
    npx @puppeteer/browsers install chrome@stable
    ```
    Also for browser testing it might be handy to have a real browser that works with proxy

    ```
    # for arm-linux 
    export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    sudo apt install chromium-browser
    ```
    This can be done by running
    ```
    source ./env.sh
    ```

    For arm-linux, puppeteer will download wrong version of chromium, so we have to manually download it, see https://github.com/puppeteer/puppeteer/issues/7740#issuecomment-1081225615

# web archive setup
- generating the right url to interact with the archive: use the `create_start_crawl_url` function in README.md
    ```
    docker build -t mitmproxy . && docker run -it --rm -p 8001:8001 -p 8002:8002 -p 8314:8314 -p 8315:8315 -p 8316:8316 --entrypoint=bash -v "$(pwd)/archive/archive-70":/proxy/archive-70  mitmproxy
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

# vuln-db setup
```
# build db instance
docker compose up --build
```
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

# Running pipeline
This should be executed in the JAW4C-JAW directory

```
python3 -m run_pipeline --conf=config.yaml
```
For simple testing
```
python3 -m analyses.example.example_analysis --input=<path to the testing script> -S ""
```

# Commonly seen problems
- 'Failed to launch the browser process!': remember to source env.sh
