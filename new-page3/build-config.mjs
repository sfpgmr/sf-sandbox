
import ejs from 'ejs';
import fse from 'fs-extra';

function renderEjsFromFile(path){
  return new Promise((resolve,reject)=>{
    ejs.renderFile(path,(err,str)=>{
      err && reject(err);
      resolve(str);
    });
  });
}

async function renderEjs(){
  const str = await renderEjsFromFile('./current/src/ejs/template-home.html');
  await fse.writeFile('./current/build/index-t.html',str,'utf-8');
}

export default {
  "buildCommands":[
    "rollup -c ./rollup.config.js",
    renderEjs,
    "postcss ./current/src/css/sfstyle-home.css -o ./current/build/sfstyle.css --config ./postcss.config.js"
  ],
  "copyFiles":[
  "./current/src/html/index.html",
  "./current/build/index.js"
  ],
  "symlinkFiles":[
    "./common/image-001.JPG",
    "./common/image-002.JPG"
  ],
  "schema":{
  }
}