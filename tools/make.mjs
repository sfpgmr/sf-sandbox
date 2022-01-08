#!/bin/sh
":" //# ; exec /usr/bin/env node --experimental-modules "$0" "$@"
import fse from 'fs-extra';
import fs from 'fs';
import resolveHome from './resolveHome.js';
import path from 'path';
import { exec as exec_ } from 'child_process';
import util from 'util';

const exec = util.promisify(exec_);

let deployBasePath = resolveHome('~/www/html/contents/sandbox/');
const sandboxDir = resolveHome('~/pj/sandbox/');

let projectName, releaseName, srcPath, destPath, deploy,newProject;
const helpMessage =
  `
-p,--project-name プロジェクト名を指定（必須）
-h,--help ヘルプ
`;

let deployPath;

function error(param, message = '必要なパラメータがありません。') {
  return new Error(`param:${param} ${message}`);
}

try {
  (async () => {
    const args = process.argv.slice(2);
    while (args.length) {
      const param = args.shift();
      switch (param) {
        case '-p':
        case '--project-name':
          {
            // projectName の指定
            if (args.length) {
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
            if (args.length && !args[0].match(/^-{1,2}/)) {
              releaseName = args.shift();
            } else {
              releaseName = '/current/';
            }
          }
          break;
        case '--deploy':
        case '-d':
          deploy = true;
          if(args.length && !args[0].match(/^-{1,2}/)){
            deployPath = resolveHome(args.shift());
          }
          break;
        case '--help':
        case '-h':
          console.info(helpMessage);
          break;
        case '-n':
        case '--new':
          if (args.length && !args[0].match(/^-{1,2}/)) {
            newProject = args.shift();
          } else {
            newProject = 'default';
          }
        break;
        default:
          throw error(param, '不明なパラメータです。');
      }
    }

    if (!projectName) {
      throw new Error('プロジェクト名の指定がありません。');
    }


    // ビルド処理
    const projectPath = path.join(sandboxDir, projectName);
    const currentPath = path.join(projectPath, 'current');

    if(newProject){
      const templateDir = path.join(sandboxDir, 'templates',newProject);
      if(await fse.pathExists(projectPath)){
        throw new Error(`${projectName}はすでに存在しています。`);
      }
      await fse.ensureDir(projectPath);
      await fse.copy(templateDir,projectPath);
      return;
    }


   
    console.info(`projectName:${projectName}をビルドします。`);


    let releasePath;

    if (releaseName) {
      releasePath = path.join(projectPath, 'releases', releaseName);
      await fse.ensureDir(releasePath);
      //fse.copy(currentPath, releasePath, { overwrite: true });
    }

    const currentBuildPath = path.join(currentPath, 'build');
    const currentSrcPath = path.join(currentPath, 'src');

    let config;
    try {
      config = (await import(path.join(projectPath, 'build-config.mjs'))).default;
      //config = await fse.readJSON(path.join(projectPath, 'build-config.json'));
    } catch (e) {
      if (e.code === 'ENOENT') {
        throw new Error('build-config.mjsファイルが見つかりません。');
      } else {
        throw e;
      }
    }

    // console.log(config);

    // ビルド
    if (config.buildCommands) {
      console.log('ビルド処理実行中');
      let commands = config.buildCommands;
      // 配列に正規化
      if (!(commands instanceof Array)) {
        commands = [commands];
      }
      for (const command of commands) {
        console.log(command);
        if(command instanceof Function){
          let bkp = process.cwd();
          process.chdir(projectPath);
          await command(); 
          process.chdir(bkp);
        } else if(command instanceof String || typeof(command) == 'string'){
          const output = await exec(command, { cwd: projectPath, maxBuffer: 500 * 1024 });
          output.stdout && console.info(output.stdout);
          output.stderr && console.error(output.stderr);
        }
      }
    }

    // 成果物のコピー
    if (config.copyFiles) {
      for (const p of config.copyFiles) {
        const src = path.normalize(path.join(projectPath, p));
        let dest = path.normalize(path.join(currentBuildPath, path.basename(src)));
        const st = await fse.stat(src);
        if(st.isDirectory()){
          dest = dest.slice(0,dest.lastIndexOf('/'));
        }
        console.info(src, '=>', dest);
        if (src != dest) {
          await fse.copy(src, dest);
        }
      }
    }

    if (config.symlinkFiles) {
      for (const p of config.symlinkFiles) {
        const src = path.normalize(path.join(projectPath, p));
        const dest = path.normalize(path.join(currentBuildPath, path.basename(src)));
        try {
          const stat = await fse.stat(dest);
          console.info('symlink already exists:', src, '=>', dest);
          await fse.unlink(dest);
        } catch (e) {
          if (e.code == 'ENOENT') {
            console.info('symlink:', src, '=>', dest);
          } else {
            throw e;
          }
        }
        await fse.symlink(src, dest);
      }
    }

    // リリースディレクトリへのコピー/リンク
    if (releasePath) {
      console.log('releaseディレクトリへのコピー')
      const releaseSrcPath = path.join(releasePath, 'src');
      const currentSrcPath = path.join(currentPath,'src');

      await fse.ensureDir(releaseSrcPath);
      // 成果物のコピー
      if (config.copyFiles) {
        for (const p of config.copyFiles) {
          const src = path.normalize(path.join(projectPath, p));
          let dest = path.normalize(path.join(releasePath, path.basename(src)));
          const st = await fse.stat(src);
          if(st.isDirectory()){
            dest = dest.slice(0,dest.lastIndexOf('/'));
          }
          console.info(src, '=>', dest);
          if (src != dest) {
            await fse.copy(src, dest);
          }
        }
      }

      if (config.symlinkFiles) {
        for (const p of config.symlinkFiles) {
          const src = path.normalize(path.join(projectPath, p));
          const dest = path.normalize(path.join(releasePath, path.basename(src)));
          try {
            const stat = await fse.stat(dest);
            console.info('symlink already exists:', src, '=>', dest);
            await fse.unlink(dest);
          } catch (e) {
            if (e.code == 'ENOENT') {
              console.info('symlink:', src, '=>', dest);
            } else {
              throw e;
            }
          }
          await fse.symlink(src, dest);
        }
      }
      // ソースファイルのコピー
      fse.copy(currentSrcPath,releaseSrcPath,{preserveTimestamps:true});
    }

    //fs.constants.S_IFLNK

    // wwwレポジトリへのデプロイ
    if (deploy) {
      if (releaseName) {
        const releaseSrcPath = path.join(releasePath,'src');
 
        console.log('wwwレポジトリへのデプロイ');
        if(!deployPath){
          deployPath = path.join(deployBasePath, projectName,'releases', releaseName);
        }
        await fse.ensureDir(deployPath);
        const deploySrcPath = path.join(deployPath, 'src');
        // ファイルコピー
        if (config.copyFiles) {
          for (const p of config.copyFiles) {
            const src = path.normalize(path.join(projectPath, p));
            let dest = path.normalize(path.join(deployPath, path.basename(src)));
            const st = await fse.stat(src);
            if(st.isDirectory()){
              dest = dest.slice(0,dest.lastIndexOf('/'));
            }
            console.info(src, '=>', dest);
            if (src != dest) {
              await fse.copy(src, dest);
            }
          }
        }
        // ファイルリンク
        if (config.symlinkFiles) {
          for (const p of config.symlinkFiles) {
            const src = path.normalize(path.join(deployBasePath,projectName, p));
            const dest = path.normalize(path.join(deployPath,  path.basename(src)));
            try {
              await fse.access(src, fs.constants.F_OK);
            } catch (e) {
              console.log(e);
              const origin = path.normalize(path.join(projectPath, p));
              console.log(origin,'=>',src);
              await fse.copy(origin, src, { dereference: true, preserveTimestamps: true });
            }

            try {
              const stat = await fse.stat(dest);
              console.info('symlink already exists:', src, '=>', dest);
              await fse.unlink(dest);
            } catch (e) {
              if (e.code == 'ENOENT') {
                console.info('symlink:', src, '=>', dest);
              } else {
                throw e;
              }
            }
            await fse.symlink(src, dest);
          }
        }

        // ソースコード
        await fse.copy(releaseSrcPath, deploySrcPath, { overwrite: true, preserveTimestamps: true });
      } else {
        throw new Error('release名の指定がありません。-r <release name>');
      }
    }

  })();
} catch (e) {
  console.log(`Error:`, e.description);
  process.abort();
}




