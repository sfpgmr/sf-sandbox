export default {
  "buildCommands":[
    "rollup -c ./rollup.config.js"
  ],
  "copyFiles":[
  "./current/src/html/index.html",
  "./current/build/index.js"
  ],
  "symlinkFiles":[
    "../common/media/horse07-2.svg"
  ],
  "schema":{
  }
}