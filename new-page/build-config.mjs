export default {
  "buildCommands":[
    "node --experimental-modules ./tools/make-page.mjs",
    "rollup -c ./rollup.config.js"
  ],
  "copyFiles":[
  "./current/src/html/index.html",
  "./current/build/index.js"
  ],
  "symlinkFiles":[],
  "schema":{
  }
}