#!/bin/sh
":" //# ; exec /usr/bin/env node --no-warnings --experimental-modules "$0" "$@"
import fs from 'fs-extra';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import rollup from 'rollup';
import resolveHome from './resolveHome';
import path from 'path';
const releaseBaseDir = resolveHome('~/pj/www/html/contents/sandbox/');
const sandboxDir = resolveHome('~/pj/sandbox/');

let projectName,releaseName,srcPath,destPath;
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
        case '--project-name':
        {
          // projectName の指定
          if(args.length){
            projectName = args.shift();
          } else {
            throw error(param);
          }
        }
        break;
        case '-r':
        case '--release':
        {
          // release 
          if(args.length && !args[0].match(/^-{1,2}/)){
            releaseName = args.shift();
          } else {
            releaseName = '/current/';
          }
        }
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
    // ビルド処理
    
    let projectPath = path.join(sandboxDir,projectName);
    console.log(projectPath);
    
   
  })();
} catch (e) {
  console.log(`Error:`,e);
  process.abort();
}




