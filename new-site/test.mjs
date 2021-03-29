import path from 'path';
import fs from 'fs';
import parser from './src/js/html-parser.mjs';
import render from './src/js/html-renderer.mjs';
import assert from 'assert/strict';
import marked from './tools/marked.esm.mjs';
import htmlDiffer from './test/markdown/helpers/html-differ.mjs';
import fm from 'front-matter';

const fsp = fs.promises;

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const testDir = path.join(currentDir,'test/markdown/specs');

let testCount = 0;
let successCount = 0;
let failCount = 0;
let failInfo = [];
let failDetail = [];

async function doTest(targetPath){
  const ext = path.extname(targetPath).toLowerCase();
  if(ext.match(/\.html?/)){
    return ;
  }
  switch(ext){
    case '.md':
      const htmlPath = targetPath.replace(new RegExp(`\\${ext}$`),".html");
      const expected = await fsp.readFile(htmlPath,'utf-8');
      const markdown = fm(await fsp.readFile(targetPath,'utf-8')).body;
      const actual = await render(await parser.parse(`<sf:md>${markdown}</sf:md>`));

      ++testCount;
      if(!await htmlDiffer.isEqual(actual,expected)){
        ++failCount;
        // console.info(`------\n${test.section}\n-----\n`);
        const diff = await htmlDiffer.firstDiff(actual, expected);
        // console.log("fail");
        // console.log(`Markdown: ${test.markdown}\nExpected: ${diff.expected}\n  Actual: ${diff.actual}`);
        failInfo.push({
          testno:testCount,
          section:'',
          expected:diff.expected,
          actual:diff.actual
        });
        failDetail.push({
          section:'',
          testno:testCount,
          markdown:markdown,
          expected:expected,
          actual:actual
        });
      } else {
        ++successCount;
      }

      break;
    case '.json':
      const tests = JSON.parse(await fsp.readFile(targetPath,'utf-8'));
      for(const test of tests){
          //const renderedHtml = await render(parser.parse(`<sf:md>${test.markdown}</sf:md>`));
          //const actual = await marked(test.markdown);
          const actual = await render(await parser.parse(`<sf:md>${test.markdown}</sf:md>`));
          ++testCount;
          if(!await htmlDiffer.isEqual(actual,test.html)){
            ++failCount;
            // console.info(`------\n${test.section}\n-----\n`);
            const diff = await htmlDiffer.firstDiff(actual, test.html);
            // console.log("fail");
            // console.log(`Markdown: ${test.markdown}\nExpected: ${diff.expected}\n  Actual: ${diff.actual}`);
            failInfo.push({
              testno:testCount,
              section:test.section,
              expected:diff.expected,
              actual:diff.actual
            });
            failDetail.push({
              section:test.section,
              testno:testCount,
              markdown:test.markdown,
              expected:test.html,
              actual:actual
            });
          } else {
            ++successCount;
          }
      }
      break;
  }
}
marked.setOptions({ gfm: true, pedantic: false, headerIds: false });

async function test(testDir){
  const dirs = await fsp.readdir(testDir);
  for (const dir of dirs){
    const currentPath = path.join(testDir,dir);
    const stat = await fsp.stat(currentPath);
    if(stat.isDirectory()){
       await test(currentPath);
    } else {
       await doTest(currentPath);
    }
  }
}

await test(path.join(testDir,'commonmark'));
await test(path.join(testDir,'gfm'));
await test(path.join(testDir,'new'));
await test(path.join(testDir,'original'));
console.log(`\n# Test Result #\n\n total:${testCount} success:${successCount} fail:${failCount} \n\n# Test End #\n\n`);
console.table(failInfo);
await fsp.writeFile("./test-result.json",JSON.stringify(failDetail,null,2),'utf-8');
