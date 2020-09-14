import parser from '../src/js/html-parser.mjs';
import fs from 'fs-extra';

const needCloseTag = /script|title/i;

const plugins = [
  ['sf',builtIn]
];

const pluginsAttr = [
  ['sf',builtInAttr]
];


const namespaceMap = new Map(plugins);
const namespaceMapForAttrs  = new Map(pluginsAttr);

function builtIn(obj,render){

}

function builtInAttr(obj,render){
  return true;
}

function stringize(target,stringizeBool = false){
  let str  = '';
  if(typeof(target) == 'boolean' && !stringizeBool){
    return { result:target};
  } else if(typeof(target) == 'object' && !(target instanceof String) && !(target instanceof Number)){
    str = JSON.stringify(target);
  } else {
    str = target;
  }
  return { result:true,value:str };
}

(async () => {
  const json = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));

  function render(obj) {
    let output = '';
    if (obj instanceof Array) {
      for (const o of obj) {
        output += render(o);
      }
    } else if(obj.namespace){
      const plugin = namespaceMap.get(obj.name);
      if(plugin){
        const result = stringize(plugin(obj,render),true);
        output += result.value;
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
          {
            maketag:{
              let temp = '<' + obj.name;
              if (obj.attributes) {
                for (const attr of obj.attributes) {
                  if(attr.namespace){
                    const attrMethod = namespaceMapForAttrs.get(attr.namespace);
                    if(attrMethod){
                      const result = stringize(attrMethod(attr,obj,temp,render));
                      if(!result.result){
                        break maketag;
                      } else {
                        if(result.value){
                          temp += result.value;
                        }
                      }
                    } else {
                      if(attr.text) {
                        temp += ` ${attr.namespace?attr.namespace + ':':''}${attr.name}="${attr.text}"`;
                      } else {
                        temp += ` ${attr.namespace?attr.namespace + ':':''}${attr.name}`;
                      }
                    }
                  } else {
                    if(attr.text) {
                      temp += ` ${attr.name}="${attr.text ? attr.text : ''}"`;
                    } else {
                      temp += ` ${attr.name}`;
                    }
                  }
                }
              }
              if (obj.content) {
                temp += '>';
                temp += render(obj.content);
                temp += `</${obj.name}>`;
              } else {
                temp += '>';
                if(obj.name.match(needCloseTag)){
                  temp += `</${obj.name}>`;
                }
              }
              output += temp;
            }
          }
      }
    }
    return output;
  }

  const html = render(json);

  await fs.writeFile(process.argv[3], html, 'utf8');
})();