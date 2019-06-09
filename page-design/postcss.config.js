const postcssPresetEnv = require('postcss-preset-env');
const postcssImport = require('postcss-import');
const postcssApply = require('postcss-apply');
const postcssSimpleVars = require('postcss-simple-vars');
const postcssNested = require('postcss-nested')

module.exports = {
  plugins: [
    postcssImport(),
    postcssApply(),
    postcssSimpleVars(),
    postcssNested(),
    postcssPresetEnv({
      stage: 0
    })
  ]
}