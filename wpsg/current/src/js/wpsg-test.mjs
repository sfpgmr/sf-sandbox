"use strict";
import fs from 'fs';
import {strict as assert } from 'assert';

function getInstance(obj, imports = {}) {
  const bin = new WebAssembly.Module(obj);
  const inst = new WebAssembly.Instance(bin, imports);
  return inst;
}

function offset(prop){
  return prop._attributes_.offset;
}

function sizeof(prop){
  return prop._attributes_.size;
}

function attr(prop){
  return prop._attributes_;
}

// エンディアンを調べる関数
function checkEndian(buffer = new ArrayBuffer(2)) {

  if (buffer.byteLength == 1) return false;

  const ua = new Uint16Array(buffer);
  const v = new DataView(buffer);
  v.setUint16(0, 1);
  // ArrayBufferとDataViewの読み出し結果が異なればリトル・エンディアンである
  if (ua[0] != v.getUint16()) {
    ua[0] = 0;
    return true;
  }
  ua[0] = 0;
  // ビッグ・エンディアン
  return false;
}

function getData(dv,attr,offset,endian){
  switch(attr.varType){
    case "i32":
      return attr.integer ? dv.getInt32(attr.offset + offset,endian) : dv.getUint32(attr.offset + offset,endian);
    case "f32":
      return dv.getFloat32(attr.offset + offset,endian);
    case "i64":
      return attr.integer ? dv.getBigInt64(attr.offset + offset,endian) : dv.getBigUint64(attr.offset + offset,endian);
    case "f64":
      return dv.getFloat64(attr.offset + offset,endian);
  }
  return undefined;
}

function getValue(dv,a,endian){
  return getData(dv,attr(a),0,endian);
}

function getDataStr(dv,name,attr,offset,endian){
  const value = getData(dv,attr,offset,endian);
  return `${('00000000' + (attr.offset + offset).toString(16)).slice(-8)}:${attr.varType}:${name}:${value}`;
}

function printMemory(dv,name,offset,mem,endian){
  for(let i in mem){
    if(i != '_attributes_' &&  mem[i]._attributes_){
      const attr = mem[i]._attributes_;
      if(attr){
        switch(attr.type){
          case "PrimitiveType":
            {
              for(let j = 0,o = 0;j < attr.num;++j,o+=attr.size){
                let n = (name.length ? name + '->' + i : i ) + (attr.num > 1 ? `[${j}]` : '');
                console.log(getDataStr(dv,n,attr,o + offset,endian));
              }
            }
            break;
          case "StructDefinition":
            {
              for(let j = 0,o = 0;j < attr.num;++j,o+=attr.size){
                let n = (name.length ? name + '->' + i : i ) + (attr.num > 1 ? `[${j}]` : '');
                printMemory(dv,n,o + offset,mem[i],endian);
              }
            }
            break;
        }
      }
    }
  }
}

class MappedMemory {
  constructor(wasmMemory,memMapPath){
    this.defs =  JSON.parse(fs.readFileSync(memMapPath,'utf8'));
    this.map = {};
    for(let i in this.defs){
      if(this.defs[i]["_attributes_"] && this.defs[i]["_attributes_"].memoryMap){
        this.map[i] = this.defs[i];
      }
    }    
    this.view = new DataView(wasmMemory.buffer);
    this.endian = checkEndian();
  }

  get(prop,offset = 0){
    if(prop instanceof String || ((typeof prop) == 'string')){
      prop = (new Function('self',`return self.map.${prop};`))(this);
    }
    const attr = prop["_attributes_"];
    const view = this.view;
    const endian = this.endian;
    switch(attr.varType){
      case "i32":
        return attr.integer ? view.getInt32(attr.offset + offset,endian) : view.getUint32(attr.offset + offset,endian);
      case "f32":
        return view.getFloat32(attr.offset + offset,endian);
      case "i64":
        return attr.integer ? view.getBigInt64(attr.offset + offset,endian) : view.getBigUint64(attr.offset + offset,endian);
      case "f64":
        return view.getFloat64(attr.offset + offset,endian);
    }
    return undefined;
  }

  set(prop,value,offset = 0){
    if(prop instanceof String || ((typeof prop) == 'string')){
      prop = (new Function('self',`return self.map.${prop};`))(this);
    }
    const attr = prop["_attributes_"];
    const view = this.view;
    const endian = this.endian;
    switch(attr.varType){
      case "i32":
        return attr.integer ? view.setInt32(attr.offset + offset,value,endian) : view.setUint32(attr.offset + offset,endian);
      case "f32":
        return view.setFloat32(attr.offset + offset,value,endian);
      case "i64":
        return attr.integer ? view.setBigInt64(attr.offset + offset,value,endian) : view.setBigUint64(attr.offset + offset,value,endian);
      case "f64":
        return view.setFloat64(attr.offset + offset,value,endian);
    }
    return undefined;
  }
  
  offset(prop){
    return prop._attributes_.offset;
  }
  
  sizeof(prop){
    return prop._attributes_.size;
  }
  
  attr(prop){
    return prop._attributes_;
  }
  
  getDataStr(name,prop,offset){
    const value = this.get(prop,offset);
    return `${('00000000' + (prop._attributes_.offset + offset).toString(16)).slice(-8)}:${prop._attributes_.varType}:${name}:${value}`;
  }

  printMemory(name = '',offset = 0,prop = this.map){
    for(let i in prop){
      if(i != '_attributes_' &&  prop[i]._attributes_){
        const attr = prop[i]._attributes_;
        if(attr){
          switch(attr.type){
            case "PrimitiveType":
              {
                for(let j = 0,o = 0;j < attr.num;++j,o+=attr.size){
                  let n = (name.length ? name + '->' + i : i ) + (attr.num > 1 ? `[${j}]` : '');
                  console.log(this.getDataStr(n,prop[i],o + offset));
                }
              }
              break;
            case "StructDefinition":
              {
                for(let j = 0,o = 0;j < attr.num;++j,o+=attr.size){
                  let n = (name.length ? name + '->' + i : i ) + (attr.num > 1 ? `[${j}]` : '');
                  this.printMemory(n,o + offset,prop[i]);
                }
              }
              break;
          }
        }
      }
    }
  }

  static checkEndian(buffer = new ArrayBuffer(2)) {

    if (buffer.byteLength == 1) return false;
  
    const ua = new Uint16Array(buffer);
    const v = new DataView(buffer);
    v.setUint16(0, 1);
    // ArrayBufferとDataViewの読み出し結果が異なればリトル・エンディアンである
    if (ua[0] != v.getUint16()) {
      ua[0] = 0;
      return true;
    }
    ua[0] = 0;
    // ビッグ・エンディアン
    return false;
  }
}

(async () => {
  const endian = checkEndian();
  // 100ms分のバッファサイズを求める
  const sampleRate = 8000;
  const memory = new WebAssembly.Memory({ initial: 20, shared: true, maximum: 20 });
  const m = new MappedMemory(memory,'../../build/wpsg.defs.json');

  const wpsg = getInstance(await fs.promises.readFile('../../build/wpsg.wasm'),{ env: { memory: memory },imports : {sin:Math.sin,cos:Math.cos,exp:Math.exp,sinh:Math.sinh,pow:Math.pow} }).exports;
  const audioBufferSize = Math.pow(2, Math.ceil(Math.log2(sampleRate * 4 * 0.1)));

  const dv = new DataView(memory.buffer);
  wpsg.setRate(sampleRate);
  assert.equal(m.get('sample_rate'),sampleRate);
  wpsg.initMemory();
  wpsg.initOutputBuffer(audioBufferSize);
  wpsg.initSynth();
  const twOffset = wpsg.assignTimbre();
  assert.notEqual(twOffset,m.get('timbre_work'));
  console.log(twOffset.toString(16));
  m.printMemory();

})();


