import fse from 'fs-extra';
import resolveHome from './resolveHome.mjs';
import path from 'path';

const releaseBase = "./releases";

(async()=>{
  try {
    const src = resolveHome(process.argv[2]);
    if(!src) {
      throw 'src名が指定されていません。';
    }
    let target = resolveHome(process.argv[3]);
    if(!target) {
      throw 'release名が指定されていません。';
    }
    target = path.join(releaseBase,target);
    await fse.ensureDir(target);
    await fse.copy(src,target,{overwrite:true,preserveTimestamps:true});
  } catch (e){
    console.log(e);
    process.abort();
  }
})();