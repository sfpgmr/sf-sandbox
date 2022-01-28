#!/bin/bash
sdir="$(dirname $0)"
cwd="$(pwd)"
cd $sdir
node ./make-site-info.mjs --delete-db
python3 ./site-doc2vec.py
python3 ./calc-similarity.py
node ./render-site-info.mjs
cd $cwd