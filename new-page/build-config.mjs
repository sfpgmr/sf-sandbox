export default {
  "buildCommands":[
    "node-sass ./current/src/css/style.scss > ./current/src/css/style.css",
    "cd ~/pj/sandbox/new-page/tools && node ./twitter.mjs",
    "cd ~/pj/sandbox/new-page/tools && node ./make-embeded.mjs",
    "rm ~/pj/sandbox/new-page/data/rendered/*",
    "rm ~/www/html/contents/twitter/index*",
    "cd ~/pj/sandbox/new-page/tools && node ./make-page.mjs",
    "rollup -c ./rollup.config.js"
  ],
  "copyFiles":[
  "./data/rendered",
  "./current/src/css/style.css",
  "./current/src/css/style.css.map",
  "./current/build/index.js"
  ],
  "symlinkFiles":[],
  "schema":{
  }
}