export default {
  "buildCommands":[
    "node --experimental-modules ./tools/make-page.mjs",
    "rollup -c ./rollup.config.js"
  ],
  "copyFiles":[
  "./current/src/html",
  "./current/src/js/minimasonry.min.js",
  "./current/src/css/style.css",
  "./current/src/css/style-masonry.css",
  "./current/build/index.js"
  ],
  "symlinkFiles":[],
  "schema":{
  }
}