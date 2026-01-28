#!/usr/bin/env python3
"""
Generate config files for bulk analysis
- ~6800 files split into 9 parts per prefix (6728 for 01, 6823 for 10)
- Prefix 01: all 9 files on onr
- Prefix 10: files 1-3 on nodejs, files 4-9 on nodejs2
- Each file on same machine gets different ports
"""

import os

# Configuration
TOTAL_ROWS = 6800
NUM_PARTS = 9

# Port assignments (close to 7474)
# Each machine needs unique ports for each of its files
PORTS = {
    # onr has 9 files (prefix 01)
    'onr': [
        {'http': '7474', 'bolt': '7687'},  # file 1
        {'http': '7475', 'bolt': '7688'},  # file 2
        {'http': '7476', 'bolt': '7689'},  # file 3
        {'http': '7477', 'bolt': '7690'},  # file 4
        {'http': '7478', 'bolt': '7691'},  # file 5
        {'http': '7479', 'bolt': '7692'},  # file 6
        {'http': '7480', 'bolt': '7693'},  # file 7
        {'http': '7481', 'bolt': '7694'},  # file 8
        {'http': '7482', 'bolt': '7695'},  # file 9
    ],
    # nodejs has 3 files (prefix 10, files 1-3)
    'nodejs': [
        {'http': '7490', 'bolt': '7700'},  # file 1
        {'http': '7491', 'bolt': '7701'},  # file 2
        {'http': '7492', 'bolt': '7702'},  # file 3
    ],
    # nodejs2 has 6 files (prefix 10, files 4-9)
    'nodejs2': [
        {'http': '7500', 'bolt': '7710'},  # file 4
        {'http': '7501', 'bolt': '7711'},  # file 5
        {'http': '7502', 'bolt': '7712'},  # file 6
        {'http': '7503', 'bolt': '7713'},  # file 7
        {'http': '7504', 'bolt': '7714'},  # file 8
        {'http': '7505', 'bolt': '7715'},  # file 9
    ],
}

# Calculate row ranges for 9 parts
base_size = TOTAL_ROWS // NUM_PARTS  # 755
remainder = TOTAL_ROWS % NUM_PARTS    # 5

ranges = []
start = 0
for i in range(NUM_PARTS):
    if i < remainder:
        # First 5 parts: 556 rows each
        end = start + base_size
        ranges.append((start, end))
        start = end + 1
    else:
        # Last 4 parts: 555 rows each
        # Except last part which will be slightly ubalanced but it is what it is
        end = start + base_size - 1
        ranges.append((start, end))
        start = end + 1

# Make the last range end with 'end'
ranges[-1] = (ranges[-1][0], 'end')

print(f"Row ranges for {NUM_PARTS} parts:")
for i, (start, end) in enumerate(ranges, 1):
    if end == 'end':
        print(f"  Part {i}: {start} to end")
    else:
        print(f"  Part {i}: {start} to {end} ({end - start + 1} rows)")

# Config template
CONFIG_TEMPLATE = """# This config is the default config used in the docker compose environment
testbed:
  ## option 1: test a specifc website
  # site: http://240.240.240.240/?target=https%3A%2F%2Fwww.google.com.pr%2Fimghp%3Fhl%3Den%26ogbl&type=soak
  ## option 2: provide a top-site list (e.g., Alexa, Tranco, etc)
  # sitelist: /input/tranco_Z2QWG_unique.csv
  archive:
    enable: true
    mappinglist: /JAW4C/JAW4C-WebArchive/archive/name_mapping.json
  from_row: 6045
  to_row: end # row number or 'end'


# 2. crawler configuration
crawler:
  # max number of urls to visit
  maxurls: 5
  # time budget for crawling each site in seconds
  sitetimeout: 180 # 5 min (since we work on archive)
  # amount of memory for the crawler
  memory: 8192
  # overwrite already existing crawled data or not
  overwrite: true
  # check if domain is up with a python request before spawning a browser instance
  domain_health_check: false
  # puppeteer additional args
  puppeteer:
    load-extension: /JAW4C/JAW4C-PTV
    load-extension-original: /JAW4C/JAW4C-PTV-Original
    proxy-server: http://proxy:8002
    ignore-certificate-errors: true
    disk-cache-dir: /dev/null
    disk-cache-size: 1

  playwright:
    proxy:
      server: http://proxy:8002


  # browser to use for crawling
  browser:
    name: firefox # options are `chrome` (crawler.js) and `firefox` (crawler-taint.js)
    headless: true
    # use foxhound if firefox is enabled (default is true)
    foxhound: true
    foxhoundpath: /JAW4C/JAW4C-JAW/crawler/foxhound

  lib_detection:
    enable: true
    detection_timeout: 60 # 60
    post_cleanup: true  # cleanup lifted file or not
    detector:
      load-extension: /JAW4C/JAW4C-PTV
      load-extension-original: /JAW4C/JAW4C-PTV-Original
      proxy-server: http://proxy:8002

vuln_db:
  connect: true
  host: db
  port: 5432
  dbname: vulndb_annotated
  user: vulndb_annotated
  password: vulndb_pwd

# 3. static analysis configuration
staticpass:
  # timeout per vulnerability (analyze_hpg / run_traversals) in seconds
  poc_analysis_timeout: 1500 # 25 min
  # timeout for graph-based querying (analysis) of each site in seconds
  analysis_timeout: 3600 # 1 hr
  # enforce a max per webpage timeout for graph generation (in seconds)
  pagetimeout: 1200 # 20 min # only 1% got cutoff, should be fine
  # iteratively write the graph output to disk (useful in case of timeouts for partial results)
  iterativeoutput: false
  # max amount of available memory for static analysis per process
  memory: 32000
  # compress the property graph or not
  compress_hpg: true
  # overwrite the existing graphs or not
  overwrite_hpg: true
  # timeout for neo4j container transactions in seconds (default: 300)
  container_transaction_timeout: 300
  # neo4j instance config
  neo4j_user: neo4j
  neo4j_pass: root
  neo4j_http_port: '7505'
  # bolt port will default to http port + 2 with ineo
  # otherwise, specify another port here
  neo4j_bolt_port: '7715'
  neo4j_use_docker: true
  keep_docker_alive: false
  # Maximum number of matching nodes to process per code pattern (prevents performance issues)
  code_matching_cutoff: 50
  # Maximum recursion depth for taint propagation (prevents stack overflow)
  call_count_limit: 5

# 4. dynamic analysis configuration
dynamicpass:
  # time budget for dynamic analysis of each site in seconds
  sitetimeout: 10800 # 3 hrs
  # which browser to use
  browser:
    name: chrome
    # use remote browserstack browsers or not
    use_browserstack: false
    browserstack_username: xyz
    browserstack_password: xyz
    browserstack_access_key: xyz

# 5. verification pass
verificationpass:
  sitetimeout: 10800 # 3 hrs
  # which browser to use
  browser:
    name: chrome
  endpoint: http://127.0.0.1:3456

cve_vuln:
  enabled: true
  passes:
    crawling: true #true
    lib_detection: true #true
    vulndb: true
    static: true
    static_neo4j: true
    lift: true #true  # enable lifting functionality
    transform: true #true  # enable sequence expression transformation
    # verification: false
    # crawling: false
    # static: true
    # static_neo4j: true
"""

# File definitions
FILE_DEFS = [
    # Prefix 01: all on onr
    ('01', 'onr', 1, 0), ('01', 'onr', 2, 1), ('01', 'onr', 3, 2),
    ('01', 'onr', 4, 3), ('01', 'onr', 5, 4), ('01', 'onr', 6, 5),
    ('01', 'onr', 7, 6), ('01', 'onr', 8, 7), ('01', 'onr', 9, 8),
    # Prefix 10: 1-3 on nodejs, 4-9 on nodejs2
    ('10', 'nodejs', 1, 0), ('10', 'nodejs', 2, 1), ('10', 'nodejs', 3, 2),
    ('10', 'nodejs2', 4, 0), ('10', 'nodejs2', 5, 1), ('10', 'nodejs2', 6, 2),
    ('10', 'nodejs2', 7, 3), ('10', 'nodejs2', 8, 4), ('10', 'nodejs2', 9, 5),
]

# Generate config files
output_dir = 'JAW4C-JAW'
os.makedirs(output_dir, exist_ok=True)

print(f"\nGenerating config files in {output_dir}/...")
generated_files = []

for prefix, machine, file_num, port_idx in FILE_DEFS:
    # Get row range (file_num goes 1-9, but ranges is 0-indexed)
    range_idx = file_num - 1
    from_row, to_row = ranges[range_idx]

    # Get port for this machine and file
    ports = PORTS[machine][port_idx]

    filename = f"config_docker_{prefix}_{machine}_{file_num}.yaml"
    filepath = os.path.join(output_dir, filename)

    config_content = CONFIG_TEMPLATE.format(
        from_row=from_row,
        to_row=to_row,
        neo4j_http_port=ports['http'],
        neo4j_bolt_port=ports['bolt']
    )

    with open(filepath, 'w') as f:
        f.write(config_content)

    generated_files.append(filename)
    print(f"  Created: {filename} (rows {from_row}-{to_row}, http:{ports['http']}, bolt:{ports['bolt']})")

print(f"\n✓ Successfully generated {len(generated_files)} config files")
print(f"\nDistribution:")
print(f"  Prefix 01 (onr): 9 files")
print(f"  Prefix 10 (nodejs): 3 files (1-3)")
print(f"  Prefix 10 (nodejs2): 6 files (4-9)")
print(f"\nPort ranges:")
print(f"  onr: HTTP 7474-7482, Bolt 7687-7695")
print(f"  nodejs: HTTP 7490-7492, Bolt 7700-7702")
print(f"  nodejs2: HTTP 7500-7505, Bolt 7710-7715")
