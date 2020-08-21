export default {
  "buildCommands":[
    "node-sass ./current/src/css/style.scss > ./current/src/css/style.css",
    "cd ~/pj/sandbox/new-page/tools && node --trace-warnings ./twitter.mjs",
    "cd ~/pj/sandbox/new-page/tools && node --trace-warnings ./make-embeded.mjs",
    "rm -f ~/pj/sandbox/new-page/data/rendered/*",
    "rm -f ~/www/html/contents/twitter/index*.html",
    "cd ~/pj/sandbox/new-page/tools && node --trace-warnings ./make-page.mjs",
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