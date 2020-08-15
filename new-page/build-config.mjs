export default {
  "buildCommands":[
    "node-sass ./current/src/css/style.scss > ./current/src/css/style.css",
    "cd ~/pj/sandbox/new-page/tools && node ./make-page.mjs",
    "rollup -c ./rollup.config.js"
  ],
  "copyFiles":[
  "./current/src/html",
  "./current/src/css/style.css",
  "./current/src/css/style.css.map",
  "./current/build/index.js"
  ],
  "symlinkFiles":[],
  "schema":{
  }
}