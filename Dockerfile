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

# Set up DEBUN
COPY JAW4C-DEBUN/package.json ../JAW4C-DEBUN/
RUN (cd /JAW4C/JAW4C-DEBUN && npm install --save-dev @types/node commander && npm install)

# Copy full directories from pipeline tests for dependency installation and webpack build
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/library_detection/test_jquery_bundle_dev/ ./tests/pipeline_test/sites/integration_test/library_detection/test_jquery_bundle_dev/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/library_detection/test_jquery_bundle/ ./tests/pipeline_test/sites/integration_test/library_detection/test_jquery_bundle/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/library_detection/test_lodash_bundle/ ./tests/pipeline_test/sites/integration_test/library_detection/test_lodash_bundle/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_assignment/ ./tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_assignment/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_cfg/ ./tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_cfg/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_function_arg/ ./tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_function_arg/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_function_call/ ./tests/pipeline_test/sites/integration_test/static_analysis/test_initial_decl_function_call/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_jq_CVE-2020-7656 ./tests/pipeline_test/sites/integration_test/static_analysis/test_jq_CVE-2020-7656/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_three_layer_bundle ./tests/pipeline_test/sites/integration_test/static_analysis/test_three_layer_bundle/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_vuln_bund_jquery_CVE-2020-7656_dev/ ./tests/pipeline_test/sites/integration_test/static_analysis/test_vuln_bund_jquery_CVE-2020-7656_dev/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/static_analysis/test_vuln_bund_jquery_CVE-2020-7656/ ./tests/pipeline_test/sites/integration_test/static_analysis/test_vuln_bund_jquery_CVE-2020-7656/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/taint_analysis/test_jquery_vuln_taint_s1_CVE-2020-7656/ ./tests/pipeline_test/sites/integration_test/taint_analysis/test_jquery_vuln_taint_s1_CVE-2020-7656/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/vuln_db_query/test_no_vuln_version/ ./tests/pipeline_test/sites/integration_test/vuln_db_query/test_no_vuln_version/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/vuln_db_query/test_vuln_match_dev/ ./tests/pipeline_test/sites/integration_test/vuln_db_query/test_vuln_match_dev/
COPY JAW4C-JAW/tests/pipeline_test/sites/integration_test/vuln_db_query/test_vuln_match/ ./tests/pipeline_test/sites/integration_test/vuln_db_query/test_vuln_match/

# Copy test_prep.py and other essential test files
COPY JAW4C-JAW/tests/pipeline_test/test_prep.py ./tests/pipeline_test/
COPY JAW4C-JAW/tests/pipeline_test/test_phases.py ./tests/pipeline_test/
COPY JAW4C-JAW/tests/pipeline_test/test_run.py ./tests/pipeline_test/

RUN (cd /JAW4C/JAW4C-JAW/tests/pipeline_test && python3 test_prep.py) 

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

# Install only runtime dependencies including Docker
RUN apt-get update && \
    apt-get install -y python3 python3-pip curl libgeos-dev pigz libgtk-3-0 openjdk-11-jre-headless ca-certificates gnupg lsb-release && \
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt-get install -y nodejs && node --version && \
    npm --version && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli


# Copy from builder stage
COPY --from=builder /JAW4C/JAW4C-JAW /JAW4C/JAW4C-JAW
COPY --from=builder /JAW4C/JAW4C-DEBUN /JAW4C/JAW4C-DEBUN
COPY --from=builder /usr/local/lib/python3.12/dist-packages /usr/local/lib/python3.12/dist-packages

# Install chromium
RUN cd /JAW4C/JAW4C-JAW/crawler && npx playwright install && npx playwright install-deps
RUN cd /JAW4C/JAW4C-JAW/driver && npx puppeteer browsers install chrome
# RUN cd /JAW4C/JAW4C-DEBUN && npm install

# Configure Docker group and permissions for DinD
RUN groupadd -f docker && \
    usermod -aG docker root

# Set Docker API version for compatibility
ENV DOCKER_API_VERSION=1.41

# Post-clean up
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV INEO_HOME=/JAW4C/JAW4C-JAW/ineo
ENV PATH=$INEO_HOME/bin:$PATH

WORKDIR /JAW4C/JAW4C-JAW