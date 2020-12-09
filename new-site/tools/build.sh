#!/bin/bash
pegjs  --cache -f es ../src/parser/html-parser.pegjs -o ../src/js/html-parser.mjs 
# node ./build-css.mjs
# node ./build-pages.mjs $1
node ./parse-html.mjs ./test/test-2.html ./test/test.json
# node --inspect-brk ./render-html.mjs ./test/test.json ./test/test-out.html 
node $1 ./render-html.mjs ./test/test.json ./test/test-out.html 
#node ./build-contents.mjs