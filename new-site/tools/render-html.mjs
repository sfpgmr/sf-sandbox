import parser from '../src/js/html-parser.mjs';
import fs from 'fs-extra';
import path from 'path';

const needCloseTag = /script|title/i;
let baseDir;

const plugins = [
  ['sf', builtIn]
];

const pluginsAttr = [
  ['sf', builtInAttr]
];

const templates = new Map();

class Location {
  constructor(so,sl,sc,eo,el,ec){
    this.start ={
      "offset":so,
      "line":sl,
      "column":sc
    };
    this.end = {
      "offset":eo,
      "line":el,
      "column":ec
    };
  }
  set(so,sl,sc,eo,el,ec){
    this.start.offset = so;
    this.start.line = sl;
    this.start.column = sc;
    this.end.offset = eo;
    this.end.line = el;
    this.end.column = ec;
  }
}


const namespaceMap = new Map(plugins);
const namespaceMapForAttrs = new Map(pluginsAttr);

async function preprocess(json) {
}

function error(location,msg){
  let errString = `line:${location.start.line}-${location.end.line},column:${location.start.column}-${location.end.column}:${msg}`;
  throw(errString);
}

function outputJS(l,src){
  return `location.set(${l.start.offset},${l.start.line},${l.start.column},${l.end.offset},${l.end.line},${l.end.column});\noutput(\`${src.replace(/(`|\\\$)/g,'\\$1')}\`);\n`;
}
function outputJSSrc(l,src){
  return `location.set(${l.start.offset},${l.start.line},${l.start.column},${l.end.offset},${l.end.line},${l.end.column});\n${src}\n`;
}

function value(v){
  if((v instanceof String) || typeof(v) == 'string'){
    return v;
  } else if(typeof(v) == 'object'){
    if(v.name == 'placeholder'){
      return '${' + v.expression + '}' || '';
    }
  }
}

async function builtIn(obj, render) {
  switch (obj.name) {
    case 'if':{
      const value = obj.attributes.find(a=>a.name == 'value');
      if(value){
        let str = outputJSSrc(obj.location,`if(${value.value}){`);
        for(const o of obj.content) {
          if(o.name == 'else'){
            str += outputJSSrc(o.location,'\n} else {\n');
          } else {
            str += await render(o);
          }
        }
        str += outputJSSrc(obj.location,'}\n');
        return str;

        }
        break;
    }
    case 'else':
      throw error(obj.location,'不正なelseです。');
    case 'script':
      if(obj.content){
        return outputJSSrc(obj.location,obj.content);
      } else {
        const src = obj.attributes.find(a=>a.name == 'src');
        if(src){
          return outputJSSrc(obj.location,src.value);
        }
      }
      break;
    case 'include':
      // インクルードファイル
      const src = obj.attributes.find(v=>v.name == 'src');
      if(!src){
        error(obj.location,'ソースファイルが見つかりません。');        
      } else {
        const includeSrcText = await fs.readFile(path.normalize(path.join(baseDir,src.value)),'utf-8');
        const includeObjs = parser.parse(includeSrcText);
        return await render(includeObjs);
      }
      break;
    case 'markdown':
      return '';//outputJS(obj.location,await marked(obj.content));
    case 'meta':
      return '';
    case 'declare-template':
      {
        const params = new Map(obj.attributes.map(d=>[d.name,d.value || null]));
        obj.params = params;
        const name = params.get('name');
        let src;
        if(name){
          src = outputJSSrc(obj.location,`function ${name} (`);
        } else {
          error(obj.location,'name属性が見つかりません。');
        }
        params.delete('name');
        if(params.size){
          src += [...params].map(d=>(d[1] || d[1] == 0)?`${d[0]}='${d[1]}'`:d[0]).join(',');
        }
        src += '){';
        if(obj.content){
          src += await render(obj.content);
        }
        src += '};';
        // テンプレートとして検出できるようにする
        const applyFunc = (()=>{
          const templateDeclare = obj;
          return (obj)=>{
            const tempParams = templateDeclare.attributes  && new Map(templateDeclare.attributes.map(d=>[d.name,d.value || null]));
            const applyParams = obj.attributes && new Map(obj.attributes.map(d=>[d.name,d.value || null]));
            applyParams && applyParams.forEach((k,v,m)=>{
              if(tempParams.get(k)){
                tempParams.set(k,v);
              }
            });
            tempParams.delete('name');
            return outputJSSrc(obj.location,`${name}(${[...tempParams].map(d=>(d[1] || d[1] == 0)?`'${d[1]}'`:d[1] === null ? 'null' : 'undefined').join(',')});\n`);
          }; 
        })();
        templates.set(name,applyFunc);
        return src;
      }
    default:
      {
        // テンプレートかどうか。そうであれば実行する
        const tempFunc = templates.get(obj.name);
        if(tempFunc){
          return await tempFunc(obj);
        }
      }
      break;
  }
  throw error(obj.location,`不正なsf:${obj.name}です。`);
}

function builtInAttr(attr, obj, render_) {
  switch (attr.name) {
    case 'if':
      break;
  }
  return true;
}

function stringize(target, stringizeBool = false) {
  let str = '';
  if (typeof (target) == 'boolean' && !stringizeBool) {
    return { result: target };
  } else if (typeof (target) == 'object' && !(target instanceof String) && !(target instanceof Number) ) {
    str = JSON.stringify(target);
  } else {
    str = target;
  }
  return { result: true, value: str };
}

function module() {

  //buildInAttr.cache = new Map();
  let outputStr = '';
  let location = new Location();

  function output(obj,escapeString = false) {
    if (typeof (obj) == 'string' || obj instanceof String) {
      outputStr += escapeString ? escapehtml(obj) : obj;
    } else if (typeof (obj) == 'number' || typeof (obj) instanceof Number) {
      outputStr += obj;
    } else {
      const temp = JSON.stringify(obj, null, 1);
      outputStr += escapeString ? escapeHtml(temp) : temp;
    }
  }

  // 引用：
  // https://qiita.com/saekis/items/c2b41cd8940923863791
  function escapeHtml(string) {
    if(typeof string !== 'string') {
      return string;
    }
    return string.replace(/[&'`"<>]/g, match => {
      return {
        '&': '&amp;',
        "'": '&#x27;',
        '`': '&#x60;',
        '"': '&quot;',
        '<': '&lt;',
        '>': '&gt;',
      }[match];
    });
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

function attr(name, value) {
  if (!value) {
    if (name) {
      return ` ${name}`;
    }
  } else {
    if (name) {
      return `${name}="${value}"`;
    }
  }
  return '';
}

async function render_(obj) {
  let src = '';
  if (obj instanceof Array) {
    for (const o of obj) {
        src += await render_(o);
    }
  } else if (obj.namespace) {
    const plugin = namespaceMap.get(obj.namespace);
    if (plugin) {
      // const result = stringize(await plugin(obj, render_),true);
      // if (result.result) {
      //   src += outputJS(obj.location,result.value);
      // }
      src += await plugin(obj, render_);
    }
  } else if ((typeof (obj) == 'string') || (obj instanceof String)) {
    // `と$はエスケープする
    src += `output(\`${obj.replace(/(`|\$)/g,'\\$1')}\`);\n`;
  } else {
    switch (obj.name) {
      case 'doctype':
        src += outputJS(obj.location,`<!DOCTYPE${attr(obj.root)}${attr(obj.type)}${attr(obj.text)}>`);
        break;
      case 'text':
        src += outputJS(obj.location,`${obj.content || ''}`);
        break;
      case 'placeholder':
        // プレースフォルダー
        switch(obj.type){
          // エスケープする
          case '#':{
            src += outputJS(obj.location,`\$\{escapeHtml(${obj.expression})\}`);
          }
          break;
          // エスケープしない
          case '@':{
           src +=  outputJS(obj.location,`\$\{${obj.expression}\}`);
          }
        }
        break;

      default:
        {
          let temp = '<' + obj.name;
          let condition;
          if (obj.attributes) {
            for (const attr of obj.attributes) {
              if (attr.namespace) {
                if (attr.namespace == 'sf' && attr.name == 'if') {
                  // sf:if attributeがあるとき
                  condition = attr.value;
                  src += outputJSSrc(obj.location,`if(${condition}) {`);
                } else {
                  if(attr.value){
                    temp += ` ${attr.namespace}:${attr.name}="${attr.value ? value(attr.value) : ''}"`;
                  } else {
                    temp += ` ${attr.namespace}:${attr.name}`;
                  }
                }
              } else {
                if (condition) {
                  // sf:if attributeがあるとき
                  temp += ` ${attr.name}="${attr.value ? value(attr.value) : ''}"`;
                } else {
                  temp += ` ${attr.name}`;
                }
              }
            }
          }
          if (obj.content) {
            temp += '>';
            src += outputJS(obj.location,temp);
            src += await render_(obj.content);
            src += outputJS(obj.location,`</${obj.name}>`);
          } else {
            temp += '>';
            if (obj.name.match(needCloseTag)) {
                temp += `</${obj.name}>`;
            }
            src += outputJS(obj.location,temp);
          }
          if (condition) {
            src += outputJSSrc(obj.location,'}');
          }
        }
    }
  }
  return src;
}

async function render(jsonString, options) {
  let ast; 
  if(jsonString instanceof String || typeof(jsonString) == 'string'){
    ast = JSON.parse(jsonString);
  } else {
    ast = jsonString;
  }
  values = [ast,plugins,pluginsAttr,Location,templates];
  const args = ['ast','plugins','pluginsAttr','Location','templates'];
  const srcHead = module.toString().replace(/function module\s*?\(\)\s*?\{(.*)\}/msg, '$1');
  if (options) {
    args.push(...Object.keys(options));
    values.push(...Object.values(options));
  }

  const src = await render_(values[0]);
  const FuncSrc = `
  ${srcHead}
   try {
   ${src}
   return outputStr;
   } catch (e) {
     if(location){
      const errString = \`line:\${location.start.line}-\${location.end.line},column:\${location.start.column}-\${location.end.column}:\${e}\`;
       throw(errString);
     } else {
       throw(e);
     }
   }`;
  console.log(src);
  const fn = new Function(...args, FuncSrc);
  const fnSrc = fn.toString();
  await fs.writeFile(`./test/${path.basename(process.argv[2], '.json')}.mjs`, fnSrc, 'utf-8');
  return fn(...values);
}

(async () => {
  try {
    const json = await fs.readFile(process.argv[2], 'utf8');
    baseDir = path.dirname(process.argv[2]);
    //const preProcessedJson = await preprocess(json);
    const html = await render(json);
    console.log(html);
    await fs.writeFile(process.argv[3], html, 'utf8');
  } catch (e) {
    console.error(e);
    process.exit(-1);
  }
})();  
