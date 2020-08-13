import fse from 'fs-extra';
import resolveHome from './resolveHome.mjs';
import path from 'path';

(async()=>{
  try {

    const base = resolveHome(process.argv[2]);
    if(!base){
      throw 'target siteディレクトリが指定されていません';
    }

    const releaseBase = process.argv[3];
    if(!releaseBase){
      throw 'release baseディレクトリが指定されていません';
    }

    const release = process.argv[4];
    if(!release){
      throw 'release名が指定されていません';
    }

    const sitePath = path.join(base,release);
    const srcPath = path.join(releaseBase,release);
    await fse.ensureDir(sitePath);
    await fse.copy(srcPath,sitePath,{overwrite:true,preserveTimestamps:true});
    await fse.copyFile(path.join(releaseBase,'index.html'),path.join(base,'index.html'),{overwrite:true});
  
  } catch (e) {
    console.error(e);
  }
})();