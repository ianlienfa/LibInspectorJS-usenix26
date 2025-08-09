#!/usr/bin/env bash

# make sure the package index is up-to-date
sudo apt update

# chromimum
sudo apt install -y chromium-browser

# Set environment variables for Puppeteer
ARCH=$(uname -m)
if [[ "$ARCH" == arm* ]] || [[ "$ARCH" == aarch64 ]]; then
    export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    echo "Puppeteer environment set for ARM ($ARCH)"
fi

if [ ! -d "./cve_jaw" ]; then
    echo "Virtual environment not found. Creating one in $VENV_DIR..."
    python3 -m venv cve_jaw || { echo "Failed to create venv"; exit 1; }
fi

source "$(realpath ./cve_jaw/bin/activate)"

# NPM dependencies
(cd crawler && npm install)
# linux: sudo npm install puppeteer --unsafe-perm=true --allow-root
# linux cd crawler/./node_modules/puppeteer && npm run install

(cd analyses/domclobbering && npm install)
(cd analyses/cs_csrf && npm install)
(cd analyses/request_hijacking && npm install)
(cd analyses/open_redirect && npm install)
(cd analyses/cve_vuln && npm install)

(cd engine && npm install)
(cd engine/lib/jaw/dom-points-to && npm install)
(cd engine/lib/jaw/normalization && npm install)
(cd dynamic && npm install)
(cd engine/lib/jaw/aliasing && make)

(cd verifier && npm install)
(cd verifier/service && npm install)

(cd driver && npm install)

# python package dependencies
sudo apt-get install libgeos-dev

# Python dependencies
pip3 install -r ./requirements.txt

# pigz
sudo apt-get install pigz

## ineo for neo4j management: https://github.com/cohesivestack/ineo
# curl -sSL https://raw.githubusercontent.com/cohesivestack/ineo/v2.1.0/ineo | bash -s install -d $(pwd)/ineo/
# source ~/.bashrc
export INEO_HOME=$(pwd)/ineo/; export PATH=$INEO_HOME/bin:$PATH

# note: java 11 required with neo4j 4.2.3
sudo apt-get install openjdk-11-jdk
