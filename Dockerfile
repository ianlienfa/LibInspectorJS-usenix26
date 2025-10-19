# Multi-stage build for JAW4C
FROM ubuntu:24.04 as builder

# Install system dependencies for building
RUN apt-get update && \
    apt-get install -y python3 python3-pip curl build-essential g++ openjdk-11-jdk libgeos-dev pigz libgtk-3-0 && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /JAW4C/JAW4C-JAW

# Copy only package.json files first for better Docker layer caching
COPY JAW4C-JAW/package.json ./
COPY JAW4C-JAW/requirements.txt ./
COPY JAW4C-JAW/analyses/cve_vuln/package.json ./analyses/cve_vuln/
COPY JAW4C-JAW/crawler/package.json ./crawler/
COPY JAW4C-JAW/dynamic/package.json ./dynamic/
COPY JAW4C-JAW/engine/package.json ./engine/
COPY JAW4C-JAW/engine/lib/jaw/dom-points-to/package.json ./engine/lib/jaw/dom-points-to/
COPY JAW4C-JAW/engine/lib/jaw/normalization/package.json ./engine/lib/jaw/normalization/
COPY JAW4C-JAW/driver/package.json ./driver/


# Install Python dependencies
ENV PIP_BREAK_SYSTEM_PACKAGES=1
RUN pip3 install -r ./requirements.txt

# Install Node.js dependencies
RUN npm install
RUN (cd analyses/cve_vuln && npm install)
RUN (cd crawler && npm install)
RUN (cd dynamic && npm install)
RUN (cd engine && npm install)
RUN (cd engine/lib/jaw/dom-points-to && npm install)
RUN (cd engine/lib/jaw/normalization && npm install)
RUN (cd driver && npm install)

# Copy aliasing source and Makefile for compilation
COPY JAW4C-JAW/engine/lib/jaw/aliasing/ ./engine/lib/jaw/aliasing/

# Build the aliasing component
RUN (cd engine/lib/jaw/aliasing && make)

# Copy essential runtime files
# COPY JAW4C-JAW/analyses/ ./analyses/
# COPY JAW4C-JAW/config.yaml ./
# COPY JAW4C-JAW/constants.py ./
# COPY JAW4C-JAW/crawler/ ./crawler/
# COPY JAW4C-JAW/data/ ./data/
# COPY JAW4C-JAW/docker/ ./docker/
# COPY JAW4C-JAW/driver/ ./driver/
# COPY JAW4C-JAW/dynamic/ ./dynamic/
# COPY JAW4C-JAW/engine/ ./engine/
# COPY JAW4C-JAW/exports/ ./exports/
# COPY JAW4C-JAW/hpg_construction/ ./hpg_construction/
# COPY JAW4C-JAW/hpg_neo4j/ ./hpg_neo4j/
# COPY JAW4C-JAW/ineo/ ./ineo/
# COPY JAW4C-JAW/input/ ./input/
# COPY JAW4C-JAW/logs/ ./logs/
# COPY JAW4C-JAW/outputs/ ./outputs/
# COPY JAW4C-JAW/run_pipeline.py ./
# COPY JAW4C-JAW/run_pipeline.sh ./
# COPY JAW4C-JAW/scripts/ ./scripts/
# COPY JAW4C-JAW/symbolic_modeling/ ./symbolic_modeling/
# COPY JAW4C-JAW/utils/ ./utils/
# COPY JAW4C-JAW/verifier/ ./verifier/
# COPY JAW4C-JAW/vuln_db/ ./vuln_db/

# Final runtime stage
FROM ubuntu:24.04 as runtime

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y python3 python3-pip libgeos-dev pigz libgtk-3-0 openjdk-11-jre-headless && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PIP_BREAK_SYSTEM_PACKAGES=1
ENV INEO_HOME=/JAW4C/JAW4C-JAW/ineo
ENV PATH=$INEO_HOME/bin:$PATH

# Copy from builder stage
COPY --from=builder /JAW4C/JAW4C-JAW /JAW4C/JAW4C-JAW
COPY --from=builder /usr/local/lib/python3.12/dist-packages /usr/local/lib/python3.12/dist-packages

WORKDIR /JAW4C/JAW4C-JAW
