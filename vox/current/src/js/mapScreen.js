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
uniform float u_pointsize;

void main() {
  
  // 表示位置の計算
  vec4 pos = vec4( u_rotate * vec3(
        vec2(
          (position.x + u_offset.x) ,
           1.0 / u_scale - (position.y + u_offset.y) 
          ) 
      ,1.0)   
    ,1.0) ;
    pos.xy *= u_scale;
  //pos.z = 1.0;

  gl_Position = pos;
  gl_PointSize = u_pointsize;
}
`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;

uniform vec4 u_color;

// 頂点シェーダーからの情報

// 出力色
out vec4 fcolor;

void main() {
  fcolor = u_color;
}
`;


let tileWidth = 0.0013724960300966176 ;
let tileHeight = 0.0011260210872360474;

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
  constructor(feature){


    switch(feature.properties.class){
      case 'RdEdg':
        this.color = vec4.fromValues(1,1,1,0.5);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
      case 'BldL':
        this.color = vec4.fromValues(1,0.5,0,1.0);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
      case 'WL':
        this.color = vec4.fromValues(0,0,1,1.0);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
      case 'RdCompt':
        this.color = vec4.fromValues(1,1,1,0.8);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
      case 'RailCL':
        this.color = vec4.fromValues(0,1,0,0.7);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
      case 'ElevPt':
        this.color = vec4.fromValues(1,0,1,1);
        this.pointSize = 4.0;
        this.drawType = 1;
        break;
      case 'Cntr':
        this.color = vec4.fromValues(1,0,0,0.5);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
      case 'GCP':
        this.color = vec4.fromValues(1,0,0,1);
        this.pointSize = 4.0;
        this.drawType = 1;
        break;
      default:
        this.color = vec4.fromValues(1,1,1,0.3);
        this.pointSize = 1.0;
        this.drawType = 0;
        break;
    }

    this.offset = MapModel.offset_;
    const pointList = feature.geometry.coordinates;
    switch(feature.geometry.type){
      case 'LineString':
        this.size = pointList.length;
        pointList.forEach(d=>{
          MapModel.points.push(...d);
        });
        MapModel.offset_ += pointList.length;
        break;
      case 'Point':
        this.size = 1;
        MapModel.points.push(...pointList);
        MapModel.offset_ += 1;
        break;
    }

  }

  static async load(url = './merged.json'){
    let mapModels = await (await fetch(url)).json();
    tileWidth = mapModels.attributes.avgWidth;
    tileHeight = mapModels.attributes.avgHeight;
    mapModels = mapModels.maps.map((featureCollestion)=>{
//      let features = featureCollestion.features.filter(f=>(f.properties.class == 'BldL' || f.properties.class.match(/Rd/)));
      let features = featureCollestion.features;//.filter(f=>(f.properties.class == "ElevPt"));
      features = features.map(feature=>{
        return new MapModel(feature);
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
    this.axis = vec3.fromValues(0,0,1);
    
    this.y = -34.666;
    this.x = -135.50055;

    this.colorLocation = gl.getUniformLocation(program,'u_color');
    this.pointSizeLocation = gl.getUniformLocation(program,'u_pointsize');
    //gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);

  }

  // スプライトを描画
  render(screen) {
    const gl = this.gl;

    // プログラムの指定
    gl.useProgram(this.program);

    // VAOをバインド
    gl.bindVertexArray(this.vao);
    const hw = (tileWidth / 256.0 * screen.console.VIRTUAL_WIDTH) / 2 ;
    const hh = (tileHeight / 256.0 * screen.console.VIRTUAL_HEIGHT) / 2;
    let ox = this.x - hw / 10 ;
    let oy = this.y - hh / 2;
    const left = ox - hw * 1,right = ox + hw * 1,top = oy - hh * 2,bottom = oy + hh * 2 ;
    setRotate(this.rotate,this.angle - Math.PI / 2,this.axis);

    // カラーパレットをバインド
    for(const featureCollection of this.mapModels){
      const attr = featureCollection.attributes;
      if(left <= attr.xmax && attr.xmin <= right && top <= attr.ymax && attr.ymin <= bottom){
        for(const obj of featureCollection.features){
          gl.uniform1f(this.scaleLocation,3000);
          gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);
          gl.uniform4fv(this.colorLocation,obj.color);
          gl.uniform1f(this.pointSizeLocation,obj.pointSize || 1.0);
          gl.uniform2f(this.offsetLocation,-ox,-oy);
          
          gl.drawArrays(obj.drawType == 0 ? gl.LINE_STRIP : gl.POINTS, obj.offset,obj.size);
        }
      }
    }
//    this.y -= 0.0000015; 
  }
}


