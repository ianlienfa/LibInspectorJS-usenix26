WebArchive tool
=======

### Installation

1. Clone this repository

2. Build the docker image by running `docker build -t mitmproxy .` on the root directory (recommended) OR install the dependencies in the Dockerfile

### Usage

1. Run the container: `docker run -it --rm --entrypoint=bash mitmproxy`
-   See `-p` docker flag to expose ports to the host

2. Run the webarchive via `entrypoint.sh`. In our DOM-XSS project we need 6 different instances of the mitmproxy running on different ports, but feel free to just run one of them by adapting `entrypoint.sh` with the appropriate number of calls to `mitmdump`. `mitmdump` accepts several arguments, the most important of which are:
-   `--set archive=<bool>` - Whether you are creating a new archive
-   `--set replay=<bool>` - Whether you are replaying an already existing archive. This will look for an archive called `current.warc.gz` in the `warcPath` folder.
-   `--set append=<bool>` - Append mode of the webarchive, sends requests to the live website when they are not in the archive, what we use in our crawls
-   `--set instrument=<bool>` - Whether to instrument page code or not before serving it to the browser

3. The webarchive will use or produce a file with the `.warc` extension on the `warcPath` folder indicated in the `mitmdump` flags.

4. Open your browser using the mitmproxy proxy. Navigate to: `http://240.240.240.240/?target=<your_target_url_urlencoded>&type=soak`
-   `240.240.240.240` is a signal to mitmproxy to start replaying. it will redirect the browser to the target URL given in the GET params
-   This URL can be automatically created given a target URL like `https://www.google.com` using this python function:
```python
from urllib.parse import urlencode, quote_plus
def create_start_crawl_url(url):
    condition = 'soak'
    query = {'target': url, 'type': condition}
    return f'http://240.240.240.240/?{urlencode(query, quote_via=quote_plus)}' 
```

### Example

Assume you have a webarchive for `https://www.google.com` at `8FFDEFBDEC956B595D257F0AAEEFD623.warc.gz` and you want to replay it without instrumentation.

1. You would copy that archive to `current.warc.gz` in the root folder of this project

2. You would pass the appropriate flags to `mitmdump`, like you see in `entrypoint.sh`. For example:
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
    --set useBabel=true \
    --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
    --set warcPath="/proxy/archive-70" \
    --set replayNearest=true \
    --set replay=true \
    --set archive=false \
    --set append=false \
    --set instrument=false > "proxy_logs/out" 2> "proxy_logs/err"
```

-   warcPath is the folder where the archives are located

3. You would launch chromium against the proxy you're using:
`/path/to/chromium --proxy-server={mitmproxy_host}:{mitmproxy_port}`, for example `chromium --proxy-server=localhost:8314`
-   Consider using `--ignore-certificate-errors` or adding the mitmproxy certificate to Chromium
`./Google\ Chrome\ for\ Testing --proxy-server=http://localhost:8002 --ignore-certificate-errors --disk-cache-dir=/dev/null --disk-cache-size=1`

4. You would navigate to `http://240.240.240.240/?target=https%3A%2F%2Fwww.google.com&type=soak`
-   Once you do, mitmproxy should be reading responses from the mitmproxy, not the real website.

5. You can monitor the replay by watching the logs in the `proxy_logs` folder that will be created.