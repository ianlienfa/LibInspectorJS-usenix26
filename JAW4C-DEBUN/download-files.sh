#!/bin/bash

mkdir -p src/data

curl -L https://zenodo.org/record/16992345/files/debun-hashes.tar.gz -o src/data/debun-hashes.tar.gz
curl -L https://zenodo.org/record/16992345/files/cdn-libs.tar.gz -o src/data/cdn-libs.tar.gz
curl -L https://zenodo.org/record/16992345/files/rq3-original.tar.gz -o src/data/rq3-original.tar.gz
curl -L https://zenodo.org/record/16992345/files/rq3-swc.tar.gz -o src/data/rq3-swc.tar.gz
curl -L https://zenodo.org/record/16992345/files/rq3-terser.tar.gz -o src/data/rq3-terser.tar.gz
curl -L https://zenodo.org/record/16992345/files/website-crawled-code.tar.gz -o src/data/website-crawled-code.tar.gz
curl -L https://zenodo.org/record/16992345/files/website-all-hashes.tar.gz -o src/data/website-all-hashes.tar.gz

for file in src/data/*.tar.gz; do
    tar -xzf "$file" -C src/data
    rm "$file"
done
