'use strict';
import { Node } from './scene.js';
import { mat4, mat3,vec3,vec2, vec4 } from './gl-matrix/gl-matrix.js';

const vertexShader = `#version 300 es
precision highp float;
precision highp int;


// 座標 X,Y,Z
layout(location = 0) in vec2 position;

uniform vec2 u_offset;
uniform float u_scale;
uniform mat3 u_rotate;

void main() {
  
  // 表示位置の計算
  vec4 pos = vec4( u_rotate * vec3(vec2((position.x + u_offset.x) * u_scale,1.0 - (u_offset.y + position.y)* u_scale),0.0),1.0) ;
  pos.z = 1.0;

  gl_Position = pos;
  gl_PointSize = 1.0;
}
`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

// 頂点シェーダーからの情報
// 出力色
out vec4 fcolor;

void main() {
  fcolor = vec4(1.0,1.0,1.0,1.0);
}
`;


const tileWidth = 0.0013724960300966176;
const tileHeight = 0.0011260210872360474;

// プログラムを使いまわすためのキャッシュ
let programCache;

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

// const voxCharacters = [];

const points = [];
export class MapModel {
  constructor(pointList){
    this.offset = MapModel.offset_;
    this.size = pointList.length;
    pointList.forEach(d=>{
      MapModel.points.push(...d);
    });
    MapModel.offset_ += pointList.length;
  }

  static async load(url = './merged.json'){
    let mapModels = await (await fetch(url)).json();
    mapModels = mapModels.map((featureCollestion)=>{
      let features = featureCollestion.features.filter(f=>(f.properties.class == 'BldL' || f.properties.class.match(/Rd/)));
      features = features.map(f =>{
        return f.geometry.coordinates;
      })
      .map(pointList=>{
        return new MapModel(pointList);
      });
      return {
        attributes:featureCollestion.attributes,
        features:features
      };
    });
    return mapModels;
  }

}

MapModel.POINT_DATA_SIZE = 4 * 2;
MapModel.points = [];
MapModel.offset_ = 0;

const SIZE_PARAM = 4;

function setRotate(mat3 ,angle,  axis){

  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const r = 1.0 - c;

  mat3[0] = axis[0] * axis[0] * r + c; 
  mat3[1] = axis[1] * axis[0] * r + axis[2] * s;
  mat3[2] = axis[2] * axis[0] * r - axis[1] * s;
  mat3[3] = axis[0] * axis[1] * r - axis[2] * s;
  mat3[4] = axis[1] * axis[1] * r + c;
  mat3[5] = axis[2] * axis[1] * r + axis[0] * s;
  mat3[6] = axis[0] * axis[2] * r + axis[1] * s;
  mat3[7] = axis[1] * axis[2] * r - axis[0] * s;
  mat3[8] = axis[2] * axis[2] * r + c;
  return mat3;
}


export class Map extends Node {
  constructor({ gl2, mapModels,visible = true}) {
    super();
    // webgl コンテキストの保存
    const gl = this.gl = gl2.gl;
    this.gl2 = gl2;

    this.endian = checkEndian();
    this.bufferData = new Float32Array(MapModel.points);
    this.mapModels = mapModels;
      
    // スプライト面の表示・非表示
    this.visible = visible;

    // プログラムの生成
    if (!programCache) {
      programCache = gl2.createProgram(vertexShader, fragmentShader);
    }

    const program = this.program = programCache;

    // アトリビュート
    // VAOの生成とバインド
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // VBOの生成
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.bufferData.buffer, gl.DYNAMIC_DRAW);

    // 属性ロケーションIDの取得と保存
    this.positionLocation = 0;
    this.stride = 8;

    // 属性の有効化とシェーダー属性とバッファ位置の結び付け
    // 位置
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, true, this.stride, 0);

    gl.bindVertexArray(null);

    // uniform変数の位置の取得と保存
    // 
    this.offsetLocation = gl.getUniformLocation(program,'u_offset');
    this.scaleLocation = gl.getUniformLocation(program,'u_scale');
    this.rotateLocation = gl.getUniformLocation(program,'u_rotate');
    this.rotate = mat3.create();
    
    this.y = -34.666;
    this.x = -135.50055;
  }

  // スプライトを描画
  render(screen) {
    const gl = this.gl;

    // プログラムの指定
    gl.useProgram(this.program);

    // VAOをバインド
    gl.bindVertexArray(this.vao);
    const hw = (tileWidth / 256.0 * screen.console.VIRTUAL_WIDTH) / 2;
    const hh = (tileHeight / 256.0 * screen.console.VIRTUAL_HEIGHT) / 2;
    let ox = this.x;
    let oy = this.y - hh;
    const left = ox - hw * 2,right = ox + hw * 2,top = oy,bottom = oy + hh*3;
    // カラーパレットをバインド
    for(const featureCollection of this.mapModels){
      const attr = featureCollection.attributes;
      if(left <= attr.xmax && attr.xmin <= right && top <= attr.ymax && attr.ymin <= bottom){
        for(const obj of featureCollection.features){
          gl.uniform1f(this.scaleLocation,1490);
          gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);
    //      gl.uniform2f(this.offsetLocation,-135.50055,this.y);
          gl.uniform2f(this.offsetLocation,-ox,-oy);
          gl.drawArrays(gl.LINE_STRIP, obj.offset,obj.size);
        }
      }
    }
//    this.y -= 0.0000015; 
  }
}


