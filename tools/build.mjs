#!/bin/sh
":" //# ; exec /usr/bin/env node --no-warnings --experimental-modules "$0" "$@"
import fs from 'fs-extra';
import rollup from 'rollup';
import resolveHome from './resolveHome';
const outputBase = resolveHome('~/pj/www/html/contents/sandbox/');
const inputBase = resolveHome('../src/');

let projectName,srcPath,destPath;
const helpMessage =
`
-p,--project-name プロジェクト名を指定（必須）
-h,--help ヘルプ
`;


function error(param,message='必要なパラメータがありません。'){
  return new Error(`param:${param} ${message}`);
}

try {
  (async()=>{
    const args = process.argv.slice(2);
    while(args.length){
      const param = args.shift();
      switch (param){
        case '-p':
        // projectName の指定
        if(args.length){
          projectName = args.shift();
        } else {
          throw error(param);
        }
        break;
        case '-r':
        // release 
        break;
        case '--help':
        case '-h':
        console.info(helpMessage);
        break;
      default:
        throw error(param,'不明なパラメータです。');
      }
    }

    if(!projectName){
      throw new Error('プロジェクト名の指定がありません。');

    }
    
    console.info(`projectName:${projectName}をビルドします。`);
   
  })();
} catch (e) {
  console.log(`Error:`,e.description);
  process.abort();
}




