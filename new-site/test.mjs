import path from 'path';
import fs from 'fs';
import parser from './src/js/html-parser.mjs';
import render from './src/js/html-renderer.mjs';
import assert from 'assert';

const fsp = fs.promises;

const currentDir = path.dirname(new URL(import.meta.url).pathname);
const testDir = path.join(currentDir,'test/markdown/specs');

async function doTest(targetPath){
  const ext = path.extname(targetPath).toLowerCase();
  if(ext.match(/\.html?/)){
    return ;
  }
  switch(ext){
    case '.md':
      break;
    case '.json':
      console.log(targetPath);
      const tests = JSON.parse(await fsp.readFile(targetPath,'utf-8'));
      for(const test of tests){
        console.info(`------\n${test.section}\n-----\n`);
          const renderedHtml = await render(parser.parse(`<sf:md>${test.markdown}</sf:md>`));
          assert.strictEqual(renderedHtml,test.html);
      }
      break;
  }
}

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

await test(testDir);