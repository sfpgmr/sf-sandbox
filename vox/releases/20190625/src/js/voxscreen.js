'use strict';
import { Node } from './scene.js';
import { mat4, vec3, vec4 } from './gl-matrix/gl-matrix.js';
import vox from './vox.js';


const vertexShader = `#version 300 es
precision highp float;
precision highp int;
/**********************************************

Vox オブジェクトの表示
(なんちゃって3D)

**********************************************/


// 座標 X,Y,Z
in vec3 position;
// カラー
in uint color;

// フラグメント・シェーダーに渡す変数
flat out vec4 v_color;// 色

#define root2 1.414213562

uniform mat4 u_worldViewProjection; // 変換行列
uniform mat4 u_model;
uniform mat4 u_invert;
uniform vec3 u_light;
uniform float u_scale;// 視点のZ座標


void main() {
  
  // 表示位置の計算
  vec4 pos = u_worldViewProjection * vec4( position * 2.  ,1.0) ;

  // 色情報の取り出し
  v_color = vec4(float(color & 0xffu)/255.0 ,float((color >> 8) & 0xffu) /255.0,float((color >> 16) & 0xffu) / 255.0,float(color >> 24) / 255.0);

  // ライティング
  vec3  inv_light = normalize((u_invert * vec4(u_light, 0.0)).xyz);
  // 座標からライティング用のベクトルを作る
  
  vec3 lv = normalize(position);

  float diffuse = clamp(dot(lv , inv_light) , 0.2, 1.0);

  v_color  = v_color * vec4(vec3(diffuse), 1.0);

  gl_Position = pos;
  // セルサイズの計算
  gl_PointSize = clamp((127.0 - pos.z) / 6.0 ,2.0,128.0);
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
  {x:-1,y:0,z:0,face:0},
  {x:1,y:0,z:0,face:1},
  {x:0,y:-1,z:0,face:2},
  {x:0,y:1,z:0,face:4},
  {x:0,y:0,z:-1,face:8},
  {x:0,y:0,z:1,face:16}
];

class VoxelModel {
  constructor({voxelData,buffer = new ArrayBuffer( VoxelModel.POINT_DATA_SIZE * voxelData.voxels.length ),offset = 0}){
    this.offset = offset;
    
    const points = [];
    const voxelMap = new Map();
    voxelData.voxels.forEach(d=>{
      let p = vec3.create();
      p[0] = d.x - (voxelData.size.x >> 1);
      p[1] = d.y - (voxelData.size.y >> 1);
      p[2] = d.z - (voxelData.size.x >> 1);
      
      let s = vec3.clone(p);
      vec3.set(s,sign(s[0]),sign(s[1]),sign(s[2]));
      voxelMap.set('x' + p[0] + 'y' + p[1] + 'z' + p[2] , true );
      let color = voxelData.palette[d.colorIndex];
      points.push({point:p,sign:s,color: (color.r ) | (color.g << 8)  | ( color.b << 16) | (color.a << 24)});
    });

    this.points = [];

    for(const p of points){
      const openFaces = faces.filter(d=>{
        return voxelMap.get('x' + (p.point[0] + d.x) + 'y' + (p.point[1] + d.y) + 'z' + (p.point[2] + d.z));
      });

      // 見えないボクセルはスキップする
      if(!openFaces.length){
        continue;
      }
      // 
      let openFlag = openFaces.reduce((a,v)=>a|v.face,0);
      p.openFlags = openFlag;
      p.openFaces = openFaces;
      this.points.push(p);
  }



    // voxelData.voxels.forEach(d=>{
    //   points.setFloat32(offset,(d.x - (voxelData.size.x >> 1)) ,this.endian);
    //   points.setFloat32(offset+4, (d.y - (voxelData.size.y >> 1)),this.endian);
    //   points.setFloat32(offset+8, (d.z - (voxelData.size.z >> 1)),this.endian);
    //   let color = voxelData.palette[d.colorIndex];
    //   points.setUint32(offset+12, (color.r ) | (color.g << 8)  | ( color.b << 16) | (color.a << 24) ,this.endian);
    //   offset += 16;
    // });

    this.voxCount = voxelData.voxels.length;
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

VoxelModel.prototype.POINT_DATA_SIZE = 19 * 4;

// const SIZE_PARAM = 4;
// const VOX_MEMORY_STRIDE =  SIZE_PARAM * (3 /* xyz */ + 1 /* color */ + 3 /* rotate xyz */ + 3 /* scale xyz */ + 1 /* charNo */ + 1 /* attribute */ );
// const VOX_OBJ_POS = 0;
// const VOX_OBJ_POS_SIZE = 3 * SIZE_PARAM;
// const VOX_OBJ_COLOR = SIZE_PARAM * VOX_OBJ_POS_SIZE;
// const VOX_OBJ_COLOR_SIZE = SIZE_PARAM;
// const VOX_OBJ_ROTATE = VOX_OBJ_COLOR + VOX_OBJ_COLOR_SIZE;
// const VOX_OBJ_ROTATE_SIZE = SIZE_PARAM * 3;
// const VOX_OBJ_SCALE = VOX_OBJ_ROTATE + VOX_OBJ_ROTATE_SIZE;
// const VOX_OBJ_SCALE_SIZE = SIZE_PARAM * 3;
// const VOX_OBJ_CHAR_NO = VOX_OBJ_SCALE + VOX_OBJ_SCALE_SIZE;
// const VOX_OBJ_CHAR_NO_SIZE = SIZE_PARAM * 1;
// const VOX_OBJ_ATTR = VOX_OBJ_CHAR_NO + VOX_OBJ_CHAR_NO_SIZE;
// const VOX_OBJ_ATTR_SIZE = SIZE_PARAM * 1;

// const VOX_OBJ_MAX = 512;

// const voxScreenMemory = new ArrayBuffer(
//   VOX_MEMORY_STRIDE * VOX_OBJ_MAX
// );

// class VoxObj {
//   constructor({gl2,visible = true,x,y,z,
//   }){

//   }
  
//   setUniforms(){

//   }

//   render(){

//   }
// }

const parser = new vox.Parser();
export async function loadVox(path){
  const models = await parser.parse(path);
  return models;
}


export class Vox extends Node {
  constructor({ gl2, data,visible = true}) {
    super();
    let points = new DataView(new ArrayBuffer(4 * 4 * data.voxels.length));
    let offset = 0;
    this.endian = checkEndian();

    // const voxelMap = new Map();
    // const vertexList = [];
    // const sx = data.size.x >> 1 ,sy = data.size.y >> 1,sz = data.size.z >> 1;
    // data.voxels.forEach(d=>{
    //   let v = vec3.create();
    //   vec3.set(v,d.x - sx,d.y - sy,d.z - sz);
    //   vertexList.push(v);
    //   voxelMap.set('x' + v[0] + 'y' + v[1] + 'z' + v[2] , true );
    // });




    

    // // なんちゃって法線ベクトルを求める
    // const normalVectors = [];

    // const aroundVoxels = [];
    // voxelList.forEach(d=>{
      
    //   for(let x = -1,ex = 2;x < ex; ++x){
    //     for(let y = -1,ey = 2;y < ey; ++y){
    //       for(let z = -1,ez = 2;z < ez; ++z){
    //         if( x == 0 && y == 0 && z == 0){
    //           continue;
    //         }
            
    //       }
    //     }
    //   }
    // });

    // const six = [
    //   { x: -1, y: 0, z: 0, ignoreFace: 0 },
    //   { x:  1, y: 0, z: 0, ignoreFace: 1 },
    //   { x:  0, y:-1, z: 0, ignoreFace: 5 },
    //   { x:  0, y: 1, z: 0, ignoreFace: 4 },
    //   { x:  0, y: 0, z:-1, ignoreFace: 2 },
    //   { x:  0, y: 0, z: 1, ignoreFace: 3 },
    // ];

    
    // レンダリング用
    data.voxels.forEach(d=>{
      points.setFloat32(offset,(d.x - (data.size.x >> 1)) ,this.endian);
      points.setFloat32(offset+4, (d.y - (data.size.y >> 1)),this.endian);
      points.setFloat32(offset+8, (d.z - (data.size.z >> 1)),this.endian);
      let color = data.palette[d.colorIndex];
      points.setUint32(offset+12, (color.r ) | (color.g << 8)  | ( color.b << 16) | (color.a << 24) ,this.endian);
      offset += 16;
    });

    this.voxCount = data.voxels.length;
    this.voxBuffer = points.buffer;

    
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
    gl.bufferData(gl.ARRAY_BUFFER, points.buffer, gl.DYNAMIC_DRAW);

    // 属性ロケーションIDの取得と保存
    this.positionLocation = gl.getAttribLocation(program, 'position');
    this.colorLocation = gl.getAttribLocation(program, 'color');
    

    this.stride = 16;

    // 属性の有効化とシェーダー属性とバッファ位置の結び付け
    // 位置
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, true, this.stride, 0);
    
    // 色
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribIPointer(this.colorLocation, 1, gl.UNSIGNED_INT, this.stride, 12);

    gl.bindVertexArray(null);

    // uniform変数の位置の取得と保存

    // ワールド・ビュー変換行列
    this.viewProjectionLocation = gl.getUniformLocation(program, 'u_worldViewProjection');

    //
    this.modelLocation = gl.getUniformLocation(program, 'u_model');

    // 視点のZ位置
    this.scaleLocation = gl.getUniformLocation(program, 'u_scale');
    // ビュー・投影行列
    this.viewProjection = mat4.create();
    // 逆行列
    this.invertLocation = gl.getUniformLocation(program,'u_invert');
    this.invert = mat4.create();

    // 平行光源の方向ベクトル
    
    this.lightLocation = gl.getUniformLocation(program, 'u_light');
    this.lightDirection = vec3.create();
    vec3.set(this.lightDirection,-0,-50,10);



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

    // uniform変数を更新
    let v = vec3.create();
    vec3.set(v,0,0,0);
    mat4.translate(this.m,this.worldMatrix,v);
    mat4.rotateX(this.m,this.m,Math.sin(this.count) * 0.8);
    mat4.rotateY(this.m,this.m,this.count);
   //mat4.rotateX(this.m,this.m,this.count);
    //mat4.rotateZ(this.m,this.m,this.count);
//    mat4.rotateY(m,m,this.count);
    this.count += 0.02;
    mat4.multiply(this.viewProjection, screen.uniforms.viewProjection, this.m);

    mat4.invert(this.invert,this.m);

    gl.uniformMatrix4fv(this.viewProjectionLocation, false,this.viewProjection);
    gl.uniformMatrix4fv(this.modelLocation, false,this.m);
    gl.uniformMatrix4fv(this.invertLocation, false,this.invert);

    gl.uniform1f(this.scaleLocation, this.count);
    gl.uniform3fv(this.lightLocation, this.lightDirection);

    // 描画命令の発行
    gl.drawArrays(gl.POINTS, 0,this.voxCount);
  }

}


