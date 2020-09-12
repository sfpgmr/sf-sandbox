import parser from '../src/js/html-parser.mjs';
import fs from 'fs-extra';

const needCloseTag = /script|title/i;


(async () => {
  const json = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));

  function render(obj) {
    let output = '';
    if (obj instanceof Array) {
      for (const o of obj) {
        output += render(o);
      }
    } else if((typeof(obj) == 'string') || (obj instanceof String)){
      output += obj;
    } else {
      switch (obj.name) {
        case 'doctype':
          output += '<!DOCTYPE';
          if (obj.root) {
            output += ' ' + obj.root;
          }

          if (obj.type) {
            output += ' ' + obj.type;
          }

          if (obj.text) {
            output +=  ' ' + obj.text;
          }

          output += ">";
          break;
        case 'text':
          output += obj.content;
          break;
        default:
          output += '<' + obj.name;
          if (obj.attributes) {
            for (const attr in obj.attributes) {
              const v = obj.attributes[attr];
              if(v && v.length) {
                output += ` ${attr}="${obj.attributes[attr] ? obj.attributes[attr] : ''}"`;
              } else {
                output += ` ${attr}`;
              }
            }
          }
          if (obj.content) {
            output += '>';
            output += render(obj.content);
            output += `</${obj.name}>`;
          } else {
            output += '>';
            if(obj.name.match(needCloseTag)){
              output += `</${obj.name}>`;
            }
          }
      }
    }
    return output;
  }

  const html = render(json);

  await fs.writeFile(process.argv[3], html, 'utf8');
})();