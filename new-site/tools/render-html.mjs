import parser from '../src/js/html-parser.mjs';
import fs from 'fs-extra';


function module (){

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
  
  function builtInAttr(attr,obj,render_){
    switch(attr.name){
      case 'if':
        break;
    }
    return true;
  }
  
  //buildInAttr.cache = new Map();
  
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
  
  function attr(name,value){
    if(!value) {
      if(name) {
        return  ` ${name}`;
      } 
    } else {
      if(name){
        return `${name}="${value}"`;
      } 
    }
    return '';
  }

  function render_(obj) {
    let src = '';
    if (obj instanceof Array) {
      for (const o of obj) {
        src += render_(o);
      }
    } else if(obj.namespace){
      const plugin = namespaceMap.get(obj.name);
      if(plugin){
        const result = stringize(plugin(obj,render_),true);
        if(result.result){
          src += `output += '${result.value}';`;
        }
      }
    } else if((typeof(obj) == 'string') || (obj instanceof String)){
      src += `output += '${obj}';`;
    } else {
      switch (obj.name) {
        case 'doctype':
          src += `output += '<!DOCTYPE${attr(obj.root)}${attr(obj.type)}${attr(obj.text)}>';`;
          break;
        case 'text':
          src += `output += '${obj.content || ''}';`;
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
                      const result = stringize(attrMethod(attr,obj,render_));
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
                temp += render_(obj.content);
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
  
  
  // function render(jsonString,options = {}){
  //   const obj = JSON.parse(jsonString);
  //   const args = Object.keys(options);
  //   args.push('obj','render_');
  //   const values = Object.values(options);
  //   values.push(obj,render_);
  //   const fn = new Function(...Object.keys(options),'obj','render_','return render_(obj);');
  //   const src = `
  //   ${render_.toString()}
  //   ${stringize.toString()}
  
  //   `;
  //   return fn(...Object.values(options),obj,render_);
  // }
  // return render;
}

function render(jsonString,options){
  const values = [JSON.parse(jsonString)];
  const args = ['obj'];
  const src = module.toString().replace(/function module \(\)\{(.*)\}/msg,'$1');
  if(options){
    args.push(...Object.keys(options));
    values.push(...Object.keys(options));
  }

  const FuncSrc = `
${src}
return render_(obj);
  `;
  const fn = new Function(...args,FuncSrc);
  return fn(...values);
}

(async () => {
  const json = await fs.readFile(process.argv[2], 'utf8');
  const html = render(json);
  await fs.writeFile(process.argv[3], html, 'utf8');
})();  
