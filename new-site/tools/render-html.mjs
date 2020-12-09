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

function builtInAttr(attr,obj,render_){
  switch(attr.name){
    case 'if':
      break;
  }
  return true;
}

function module (){


  
  //buildInAttr.cache = new Map();
  let outputStr = '';
  
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
  


  function output(obj){
    if(typeof(obj) == 'string' || obj instanceof String){
      outputStr += obj;
    } else if (typeof(obj) == 'number' || typeof(obj) instanceof Number){
      outputStr += obj;
    } else {
      outputStr += JSON.stringify(obj,null,1);
    }
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

function render_(obj,inString = false) {
  let src = '';
  if (obj instanceof Array) {
    for (const o of obj) {
      src += render_(o,inString);
    }
  } else if(obj.namespace){
    const plugin = namespaceMap.get(obj.name);
    if(plugin){
      const result = stringize(plugin(obj,render_),true);
      if(result.result){
        if(inString){
          src += result.value;
        } else {
          src += `output(\`${result.value}\`);`;
        }
      }
    }
  } else if((typeof(obj) == 'string') || (obj instanceof String)){
    if(inString){
      src += `${obj}`;
    } else {
      src += `output(\`${obj}\`);`;
    }
  } else {
    switch (obj.name) {
      case 'doctype':
        if(inString){
          src += `<!DOCTYPE${attr(obj.root)}${attr(obj.type)}${attr(obj.text)}>`;
        } else {
          src += `output('<!DOCTYPE${attr(obj.root)}${attr(obj.type)}${attr(obj.text)}>');\n`;
        }
        break;
      case 'text':
        if(inString){
          src += `${obj.content || ''}`;
        } else {
          src += `output(\`${obj.content || ''}\`);\n`;
        }
        break;
      default:
        {
            let temp = '<' + obj.name;
            let condition;
            if (obj.attributes) {
              for (const attr of obj.attributes) {
                if(attr.namespace){
                  if(attr.namespace == 'sf' && attr.name == 'if'){
                    condition = attr.value;
                  } else {
                    // const attrMethod = namespaceMapForAttrs.get(attr.namespace);
                    // if(attrMethod){
                    //   const result = stringize(attrMethod(attr,obj,render_));
                    // } else {
                    //   if(attr.text) {
                    //     temp += ` ${attr.namespace?attr.namespace + ':':''}${attr.name}="${attr.text}"`;
                    //   } else {
                    //     temp += ` ${attr.namespace?attr.namespace + ':':''}${attr.name}`;
                    //   }
                    // }
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
              temp += render_(obj.content,true);
              temp += `</${obj.name}>` ;
              //temp += (inString ? `</${obj.name}>` : `</${obj.name}>\`);`);
            } else {
              temp += '>';
              if(obj.name.match(needCloseTag)){
                if(inString){
                  temp += `</${obj.name}>`;
                } else {
                  temp += `</${obj.name}>\`);`;
                }
              }
            }
            if(condition){
                src += `if(${condition}) {output(\`${temp}\`)}`;
            } else {
              if(inString){
                src += `${temp}`;
              } else {
                src += `output(\`${temp}\`);\n`;
              }
            }
          }
    }
  }
  return src;
}

function render(jsonString,options){
  const values = [JSON.parse(jsonString)];
  const args = ['obj'];
  let src = module.toString().replace(/function module \(\)\{(.*)\}/msg,'$1');
  if(options){
    args.push(...Object.keys(options));
    values.push(...Object.keys(options));
  }

  src += render_(values[0]);
  const FuncSrc = `
   ${src}
   return outputStr;`;
  const fn = new Function(...args,FuncSrc);
  //console.log(render_(values[0]));
  return fn(...values);
}

(async () => {
  const json = await fs.readFile(process.argv[2], 'utf8');
  const html = render(json);
  console.log(html);
  await fs.writeFile(process.argv[3], html, 'utf8');
})();  
