> [!warning]
> This repository contains the ASE (IEEE/ACM International Conference on Automated Software Engineering) 2025 submission archive version for reproducing the paper results. For the latest version and updates, please refer to: https://github.com/ku-plrg/debun

# DEBUN: Detecting Bundled JavaScript Libraries on Web using Property-Order Graphs

This artifact evaluates DEBUN, a scalable technique for detecting JavaScript libraries and their versions using function-level fingerprints based on Property-Order Graphs (POGs). DEBUN addresses the challenges of library detection in modern web applications where bundlers like Webpack transpile and obscure the original code structure.

## Overview

Modern web applications extensively use JavaScript bundlers that transform and bundle multiple files, making traditional library detection methods ineffective. DEBUN introduces Property-Order Graphs (POGs) to capture the execution order of property operations within function bodies, which remains preserved despite bundling transformations.

## Requirements

- Docker (recommended)
- Node.js 18+ (for local installation)
- 4GB+ RAM
- 2GB+ disk space

## Getting Started

### Quick Start with Docker

```bash
# Build the Docker image
docker build -t debun .

# Run the container
docker run -it --rm debun:latest /bin/bash
```

### Local Installation

```bash
# Install dependencies
npm install

# Make the script executable
chmod +x debun.sh
chmod +x download-files.sh

# Download files
./download-files.sh
```

## Artifact Structure

```
.
├── Dockerfile
├── README.md
├── debun.sh                    # Main CLI interface
├── download-files.sh           # Download evaluation datasets
├── package.json
├── src
│   ├── cmd
│   │   └── crawler.ts          # Website crawling functionality
│   ├── debun
│   │   ├── phase1
│   │   │   └── lib-database.ts # Library database construction
│   │   └── phase2
│   │       └── lib-scorer.ts   # Library detection and scoring
│   ├── evaluation
│   │   ├── run-rq1
│   │   │   └── index.ts        # Library detection evaluation
│   │   ├── run-rq2
│   │   │   └── index.ts        # Version detection evaluation
│   │   ├── run-rq3
│   │   │   ├── index.ts        # Ablation study
│   │   │   └── property-cnt.ts # Property counting baseline
│   │   └── run-rq3-2
│   │       └── index.ts        # Ablation study - Library/Version detection
│   ├── example
│   │   ├── example.js          # Sample JavaScript file
│   │   └── example.json        # Expected fingerprint output
│   ├── fingerprint-collector
│   │   ├── function-collector.ts # Extract functions from JS files
│   │   ├── hash-function.ts      # POG hashing implementation
│   │   ├── index.ts             # Main fingerprint collector
│   │   └── pog-generator.ts     # Property-Order Graph generation
│   ├── ground
│   │   └── ground-truth.csv     # Manual ground truth annotations
│   └── ...
└── tsconfig.json
```

## Basic Usage

### Test Fingerprint Collection

Test the fingerprint collector on the provided example:

```bash
$ ./debun.sh fingerprint-collector src/example/example.js
```

This will extract function-level fingerprints using POGs from the example JavaScript file.

### Detect Libraries in Real Websites

Detect libraries in a directory:

```bash 
$ ./debun.sh detect --dir 240_240_240_240-303ecedde750d6b3dcff2efc52f66a4baf7ad24f47cba950e45d00592d11d2b8/303ecedde750d6b3dcff2efc52f66a4baf7ad24f47cba950e45d00592d11d2b8
```

**Note**: Some websites may block crawling attempts, which could prevent successful detection.

## Evaluation - Research Questions

The paper evaluates DEBUN on three main research questions:

### RQ1: Library Detection Performance

Compares DEBUN with state-of-the-art tools (LDC and PTDETECTOR) on library detection:

```bash
$ ./debun.sh run RQ1
```

**Expected Results:**

| Metrics   | PTDETECTOR |  LDC   | DEBUN  |
| :-------- | :--------: | :----: | :----: |
| Precision |   90.11%   | 97.37% | 96.53% |
| Recall    |   36.77%   | 49.78% | 87.44% |
| F1-score  |   52.23%   | 65.88% | 91.76% |

Detailed logs(and time distributions) are available in:

```
src/results/rq1
```

### RQ2: Library Version Detection

Compares DEBUN with state-of-the-art tools (LDC) on library version detection:

```bash
$ ./debun.sh run RQ2
```

**Expected Results:**

| Metrics   | LDC (exact) | DEBUN (exact) | LDC (inclusion) | DEBUN (inclusion) |
| :-------- | :---------: | :-----------: | :-------------: | :---------------: |
| Precision |   100.00%   |    81.13%     |     93.75%      |      78.70%       |
| Recall    |   41.91%    |    40.95%     |     42.86%      |      80.95%       |
| F1-Score  |   59.07%    |    54.43%     |     58.82%      |      79.81%       |

Detailed logs are available in:

```
src/results/rq2
```

### RQ3: Ablation Study

Tests different fingerprinting approaches to validate POG effectiveness:

```bash
$ ./debun.sh run RQ3-1
```

**Compared Models:**

- Count: Simple property operation counting
- POG: Basic Property-Order Graphs
- POG+F: POG with branch flipping
- POG+FB: POG+F with branch bypassing
- POG+FBC: POG+FB with path cloning (full DEBUN)

Detailed logs are available in:

```
src/results/rq3
```

Tests different fingerprinting approaches for JavaScript library/version detection:

```bash
$ ./debun.sh run RQ3-2
```

**Compared Models:**

- Count: Simple property operation counting
- POG: Basic Property-Order Graphs
- POG+FBC: POG+FB with path cloning (full DEBUN)

**Expected Results:**

Library Detection:

| Metric    |  Count |    POG | POG+FBC |
| :-------- | -----: | -----: | ------: |
| Precision | 75.74% | 95.96% |  96.53% |
| Recall    | 92.38% | 85.20% |  87.44% |
| F1-score  | 83.23% | 90.26% |  91.76% |

Version Detection:

| Metric    |  Count |    POG | POG+FBC |
| :-------- | -----: | -----: | ------: |
| Precision | 52.69% | 70.37% |  78.70% |
| Recall    | 83.81% | 72.38% |  80.95% |
| F1-score  | 64.71% | 71.36% |  79.81% |
