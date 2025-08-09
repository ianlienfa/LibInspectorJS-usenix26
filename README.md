Setup this directory

1. Download all the required repos

- CVE_JAW: https://github.com/ianlienfa/CVE-JAW
- Library_Detector_GTV: https://github.com/ianlienfa/Library-Detector-GTV
- Bundle-PTV: https://github.com/ianlienfa/Bundle-PTV
- PTV(Original version): https://github.com/aaronxyliu/PTV
- Web archive: `git clone -b latest git@cement.andrew.cmu.edu:DOM-XSS/jalangi2.git`


2. Setup them respectively
- CVE_JAW requires running ./install.sh, setting up python environment (venv recommended) and run `pip install -r requiremenet.txt`
- Webarchive requires building its own docker image

3. Start testing (CVE_JAW)
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
- 

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

# Common seen problems
- 'Failed to launch the browser process!': remember to source env.sh
