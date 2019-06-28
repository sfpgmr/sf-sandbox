'use strict';
import { Node } from './scene.js';
import { mat4, vec3, vec4 } from './gl-matrix/gl-matrix.js';
import vox from './vox.js';


const vertexShader = `#version 300 es
precision highp float;
precision highp int;

#define d(b,x,y,z) \
if((face & b) > 0u){ \
vec3 f = (u_model * vec4(x,y,z,1.)).xyz; \
float e = dot(f,u_eye); \
if(e >  eye_dot){ \
  eye_dot = e; \
  diffuse = dot(f,u_light); \
} \
}

/**********************************************

Vox オブジェクトの表示
(なんちゃって3D)

**********************************************/


// 座標 X,Y,Z
in vec3 position;
// カラー
in uint color;
in uint face;

// フラグメント・シェーダーに渡す変数
flat out vec4 v_color;// 色

#define root2 1.414213562

uniform mat4 u_worldViewProjection; // 変換行列
uniform mat4 u_model;
uniform vec3 u_eye;
uniform mat4 u_invert;
uniform vec3 u_light;
uniform float u_scale;


void main() {
  
  // 表示位置の計算
  vec4 pos = u_worldViewProjection * vec4( position * u_scale  ,1.0) ;

  // 色情報の取り出し
  v_color = vec4(float(color & 0xffu)/255.0 ,float((color >> 8) & 0xffu) /255.0,float((color >> 16) & 0xffu) / 255.0,float(color >> 24) / 255.0);

  // ライティング
  vec3  inv_light = normalize((u_invert * vec4(u_light, 0.0)).xyz);

  // ライティング用のベクトルを作る
  float diffuse;
  float eye_dot;
  
  d(0x1u,-1.,0.,0.);
  d(0x2u,1.,0.,0.);
  d(0x4u,0.,-1.,0.);
  d(0x8u,0.,1.,0.);
  d(0x10u,0.,0.,-1.);
  d(0x20u,0.,0.,1.);

  diffuse = clamp(diffuse, 0.2, 1.0);

  v_color  = v_color * vec4(vec3(diffuse), 1.0);

  gl_Position = pos;
  // セルサイズの計算
  gl_PointSize = clamp((127.0 - pos.z) / 6.0 ,1.4 * u_scale,128.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
precision highp int;


// 頂点シェーダーからの情報
flat in vec4 v_color;// スプライト色

#define root2 1.414213562

// 出力色
out vec4 fcolor;

void main() {
  fcolor = v_color;
}
`;

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

function sign(x){
  return x == 0 ? 0 : ( x > 0 ? 1 : -1);
}

const faces = [
  {x:-1,y:0,z:0,face:1},
  {x:1,y:0,z:0,face:2},
  {x:0,y:-1,z:0,face:4},
  {x:0,y:1,z:0,face:8},
  {x:0,y:0,z:-1,face:16},
  {x:0,y:0,z:1,face:32}
];

const voxelModels = [];

class VoxelModel {
  constructor({voxelData,offset = 0}){
    this.offset = offset;
    
    const points = [];
    const voxelMap = new Map();
    voxelData.voxels.forEach(d=>{
      let p = vec3.create();
      p[0] = d.x - (voxelData.size.x >> 1);
      p[1] = d.y - (voxelData.size.y >> 1);
      p[2] = d.z - (voxelData.size.z >> 1);
      
      let s = vec3.clone(p);
      vec3.set(s,sign(s[0]),sign(s[1]),sign(s[2]));
      voxelMap.set('x' + p[0] + 'y' + p[1] + 'z' + p[2] , true );
      let color = voxelData.palette[d.colorIndex];
      points.push({point:p,sign:s,color: (color.r ) | (color.g << 8)  | ( color.b << 16) | (color.a << 24)});
    });

    this.points = [];

    for(const p of points){
      const openFaces = faces.filter(d=>{
        return !voxelMap.get('x' + (p.point[0] + d.x) + 'y' + (p.point[1] + d.y) + 'z' + (p.point[2] + d.z));
      });

      // 見えないボクセルはスキップする
      if(openFaces.length == 0){
        continue;
      }
      // 
      let openFlag = openFaces.reduce((a,v)=>a|v.face,0);
      p.openFlag = openFlag;
      p.openFaces = openFaces;
      this.points.push(p);
    }

    this.buffer = new ArrayBuffer(this.points.length * 4 * 5);
    this.endian = checkEndian();
    const dv = new DataView(this.buffer);
    for(const p of this.points){
      dv.setFloat32(offset,p.point[0] ,this.endian);
      dv.setFloat32(offset+4, p.point[1],this.endian);
      dv.setFloat32(offset+8, p.point[2],this.endian);
      dv.setUint32(offset+12,p.color,this.endian);
      dv.setUint32(offset+16,p.openFlag,this.endian);
      offset += 20;
    }




    // voxelData.voxels.forEach(d=>{
    //   points.setFloat32(offset,(d.x - (voxelData.size.x >> 1)) ,this.endian);
    //   points.setFloat32(offset+4, (d.y - (voxelData.size.y >> 1)),this.endian);
    //   points.setFloat32(offset+8, (d.z - (voxelData.size.z >> 1)),this.endian);
    //   let color = voxelData.palette[d.colorIndex];
    //   points.setUint32(offset+12, (color.r ) | (color.g << 8)  | ( color.b << 16) | (color.a << 24) ,this.endian);
    //   offset += 16;
    // });

    this.voxCount = this.points.length;
    //this.voxBuffer = points.buffer;
  }

  static async loadFromUrls(voxDataArray){
    for(const url of voxDataArray){
      const parser = new vox.Parser();
      const data = await parser.parse(url);
      voxCharacters.push(new VoxCharacter(data));
    }
  }
}

VoxelModel.prototype.POINT_DATA_SIZE = 5 * 4;

const SIZE_PARAM = 4;
const VOX_OBJ_POS = 0;
const VOX_OBJ_POS_SIZE = 3 * SIZE_PARAM;
const VOX_OBJ_ROTATE = VOX_OBJ_POS + VOX_POS_SIZE;
const VOX_OBJ_ROTATE_SIZE = SIZE_PARAM * 3;
const VOX_OBJ_SCALE = VOX_OBJ_ROTATE + VOX_OBJ_ROTATE_SIZE;
const VOX_OBJ_SCALE_SIZE = SIZE_PARAM;
const VOX_OBJ_CHAR_NO = VOX_OBJ_SCALE + VOX_OBJ_SCALE_SIZE;
const VOX_OBJ_CHAR_NO_SIZE = SIZE_PARAM * 1;
const VOX_OBJ_ATTR = VOX_OBJ_CHAR_NO + VOX_OBJ_CHAR_NO_SIZE;
const VOX_OBJ_ATTR_SIZE = SIZE_PARAM * 1;
const VOX_MEMORY_STRIDE =  SIZE_PARAM * (VOX_OBJ_POS_SIZE + VOX_OBJ_COLOR_SIZE +  VOX_OBJ_ROTATE_SIZE + VOX_OBJ_SCALE_SIZE + VOX_OBJ_CHAR_NO_SIZE + VOX_OBJ_ATTR_SIZE);

const VOX_OBJ_MAX = 16;

const voxScreenMemory = new ArrayBuffer(
  VOX_MEMORY_STRIDE * VOX_OBJ_MAX
);

const parser = new vox.Parser();
export async function loadVox(path){
  const models = await parser.parse(path);
  return models;
}


export class Vox extends Node {
  constructor({ gl2, data,visible = true}) {
    super();
    //let points = new DataView(new ArrayBuffer(4 * 4 * data.voxels.length));
    let offset = 0;
    this.endian = checkEndian();
    this.voxScreenMemory = new DataView(voxScreenMemory);

    this.voxelModel = new VoxelModel({voxelData:data});

    this.voxCount = this.voxelModel.voxCount;
    this.voxBuffer = this.voxelModel.buffer;

    
    // スプライト面の表示・非表示
    this.visible = visible;

    // webgl コンテキストの保存
    const gl = this.gl = gl2.gl;
    this.gl2 = gl2;

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
    // VBOにスプライトバッファの内容を転送
    gl.bufferData(gl.ARRAY_BUFFER, this.voxBuffer, gl.DYNAMIC_DRAW);

    // 属性ロケーションIDの取得と保存
    this.positionLocation = gl.getAttribLocation(program, 'position');
    this.faceLocation = gl.getAttribLocation(program,'face');
    this.colorLocation = gl.getAttribLocation(program, 'color');
    

    this.stride = 20;

    // 属性の有効化とシェーダー属性とバッファ位置の結び付け
    // 位置
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, true, this.stride, 0);
    
    // 色
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribIPointer(this.colorLocation, 1, gl.UNSIGNED_INT, this.stride, 12);

    gl.enableVertexAttribArray(this.faceLocation);
    gl.vertexAttribIPointer(this.faceLocation, 1, gl.UNSIGNED_INT, this.stride, 16);

    gl.bindVertexArray(null);

    // uniform変数の位置の取得と保存

    // ワールド・ビュー変換行列
    this.viewProjectionLocation = gl.getUniformLocation(program, 'u_worldViewProjection');

    //
    this.modelLocation = gl.getUniformLocation(program, 'u_model');
    this.model = mat4.identity(mat4.create());

    //
    this.eyeLocation = gl.getUniformLocation(program, 'u_eye');
    this.eye = vec3.create();
    vec3.set(this.eye,0,0,1);
    this.position = vec3.create();


    // 視点のZ位置
    this.scaleLocation = gl.getUniformLocation(program, 'u_scale');
    this.scale = 1.0;
    // ビュー・投影行列
    this.viewProjection = mat4.create();
    // // 逆行列
    // this.invertLocation = gl.getUniformLocation(program,'u_invert');
    // this.invert = mat4.create();

    // 平行光源の方向ベクトル
    
    this.lightLocation = gl.getUniformLocation(program, 'u_light');
    this.lightDirection = vec3.create();
    vec3.set(this.lightDirection,0,0,1);



    this.m = mat4.create();
    this.count = 0;
  }

  // スプライトを描画
  render(screen) {
    const gl = this.gl;

    // プログラムの指定
    gl.useProgram(this.program);

    // VoxBufferの内容を更新
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    //gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.voxBuffer);

    // VAOをバインド
    gl.bindVertexArray(this.vao);
    const memory = this.voxScreenMemory;
    const endian = this.endian;

    for(let offset = 0,eo = this.voxScreenMemory.byteLength;offset < eo;offset += VOX_MEMORY_STRIDE){
      
      // uniform変数を更新

      mat4.rotateX(this.model,mat4.identity(this.model),memory.getFloat32(offset + VOX_OBJ_ROTATE,endian));
      mat4.rotateZ(this.model,this.model,memory.getFloat32(offset + VOX_OBJ_ROTATE + 4,endian));
      mat4.rotateY(this.model,this.model,memory.getFloat32(offset + VOX_OBJ_ROTATE + 8,endian));

      this.position.set(v,memory.getFloat32(offset + VOX_OBJ_POS,endian) ,memory.getFloat32(offset + VOX_OBJ_POS + 4,endian),memory.getFloat32(offset + VOX_OBJ_POS + 8,andian));
      mat4.translate(this.m,this.model,this.position);

      mat4.multiply(this.m,this.worldMatrix,this.m);

      mat4.multiply(this.viewProjection, screen.uniforms.viewProjection, this.m);

      //mat4.invert(this.invert,this.m);

      gl.uniformMatrix4fv(this.viewProjectionLocation, false,this.viewProjection);
      gl.uniformMatrix4fv(this.modelLocation, false,this.model);
      //gl.uniformMatrix4fv(this.invertLocation, false,this.invert);

      gl.uniform1f(this.scaleLocation, this.scale);
      gl.uniform3fv(this.eyeLocation, this.eye);
      gl.uniform3fv(this.lightLocation, this.lightDirection);

      // 描画命令の発行
      gl.drawArrays(gl.POINTS, 0,this.voxCount);

    }

  }

}


