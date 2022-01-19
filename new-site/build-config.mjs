export default {
  "buildCommands":[
    "rollup -c ./rollup.config.js"
  ],
  "deploySrc":false,
  "copyFiles":[
  "./current/src/html/index.html",
  "./current/build/index.js",
  "./current/src/html/similar-list.html",
  "./current/build/similar-list.js",
  "./data/db/site-info.json"
  ],
  "symlinkFiles":[],
  "schema":{
  }
};