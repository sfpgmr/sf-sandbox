#!/bin/bash
# pegjs  --cache -f es ../src/parser/html-parser.pegjs -o ../src/js/html-parser.mjs --trace
# pegjs  --cache -f es ../src/parser/html-parser.pegjs -o ../src/js/html-parser.mjs --trace
pegjs  --cache -f es ../src/parser/html-parser.pegjs -o ../src/js/html-parser.mjs
# node ./build-pages.mjs $1

node ./parse-html.mjs ./test/test-2.html ./test/json/test-2.json > ./test/out/test.out.txt

node ./parse-html.mjs ./test/test-md.html ./test/json/test-md.json > ./test/out/test-md.out.txt

node ./parse-html.mjs ./test/test-3.html ./test/json/test-3.json > ./test/out/test-3.out.txt

node ./parse-html.mjs ./test/test-md-heading.html ./test/json/test-md-heading.json > ./test/out/test-md-heading.out.txt

node ./parse-html.mjs ./test/test-script.html ./test/json/test-script.json > ./test/out/test-script.out.txt

# node ./parse-html.mjs ./test/test-3.html ./test/test-3.json
# node --inspect-brk ./render-html.mjs ./test/test.json ./test/test-out.html 
node $1 ./render-html.mjs ./test/json/test-2.json ./test/html/test-2.out.html 
node $1 ./render-html.mjs ./test/json/test-md.json ./test/html/test-md.out.html 
node $1 ./render-html.mjs ./test/json/test-3.json ./test/html/test-3.out.html 
node $1 ./render-html.mjs ./test/json/test-md-heading.json ./test/html/test-md-heading.out.html 
node $1 ./render-html.mjs ./test/json/test-script.json ./test/html/test-script.out.html 

#node ./build-contents.mjs