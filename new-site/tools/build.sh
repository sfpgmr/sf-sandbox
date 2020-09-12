#!/bin/bash
pegjs  --cache -f es ../src/parser/html-parser.pegjs -o ../src/js/html-parser.mjs 
# node ./build-css.mjs
# node ./build-pages.mjs $1
node ./parse-html.mjs ../dist/test.html ./out.json
node ./render-html.mjs ./out.json ../dist/test-out.html 
#node ./build-contents.mjs