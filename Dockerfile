FROM alpine:latest

COPY --from=mcr.microsoft.com/playwright:v1.49.1-arm64 /ms-playwright/chromium-1148/chrome-linux/ /opt/chrome/
COPY JAW4C-JAW /JAW4C/JAW4C-JAW 

RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs build-essential && \
    apt-get install -y libgeos-dev pigz && \
    export INEO_HOME=$(pwd)/ineo/; export PATH=$INEO_HOME/bin:$PATH && \
    apt-get install -y openjdk-11-jdk && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /JAW4C/JAW4C-JAW
RUN ls /JAW4C/JAW4C-JAW 
RUN ls .
RUN (cd analyses/cve_vuln && npm install)
RUN (cd analyses/cve_vuln && npm install)
RUN (cd dynamic && npm install)
RUN (cd engine/lib/jaw/aliasing && make)
RUN (cd verifier && npm install)
RUN (cd verifier/service && npm install)

RUN (cd driver && npm install)

# Python dependencies
ENV PIP_BREAK_SYSTEM_PACKAGES=1
RUN pip3 install -r ./requirements.txt
