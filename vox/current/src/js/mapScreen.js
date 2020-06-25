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
uniform mat2 u_rotate;

void main() {
  
  // 表示位置の計算
  vec4 pos = vec4( u_rotate * position * u_scale + u_offset ,0.0,1.0) ;
  
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
    this.pointList = pointList;
  }

  static async load(url = './temp/merged.json'){
    const features = (await ( await fetch(url)).json()).features.filter(f=>f.properties.class == 'BldL');
    return features.map(f => {
      return f.geometry.coordinates;
    }).map(pointList=>{
      return new MapModel(pointList);
    });
  }
}

Map.prototype.POINT_DATA_SIZE = 4 * 2;
Map.prototype.points = [];
Map.prototype.offset = 0;

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

    //let points = new DataView(new ArrayBuffer(4 * 4 * data.voxels.length));
    this.endian = checkEndian();
    this.voxScreenMemory = new DataView(memory,offset,this.MEMORY_SIZE_NEEDED);
    //his.voxScreenBuffer = new Uint8Array(memory,offset,this.MEMORY_SIZE_NEEDED);
    this.voxelModels = voxelModels;
    this.voxelBuffer = this.voxelModels.buffer;
      
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
    // VBOにスプライトバッファの内容を転送
    gl.bufferData(gl.ARRAY_BUFFER, this.voxelBuffer, gl.DYNAMIC_DRAW);

    // 属性ロケーションIDの取得と保存
    this.positionLocation = 0;
    this.pointAttribLocation = 1;

    this.stride = 16;

    // 属性の有効化とシェーダー属性とバッファ位置の結び付け
    // 位置
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, true, this.stride, 0);
    
    // 属性
    gl.enableVertexAttribArray(this.pointAttribLocation);
    gl.vertexAttribIPointer(this.pointAttribLocation, 1, gl.UNSIGNED_INT, this.stride, 12);

    gl.bindVertexArray(null);

    // uniform変数の位置の取得と保存

    // UBO
    // this.objAttrLocation = gl.getUniformBlockIndex(program,'obj_attributes');
    // gl.uniformBlockBinding(program,this.objAttrLocation,0);
    // this.objAttrBuffer = gl.createBuffer();
    // gl.bindBuffer(gl.UNIFORM_BUFFER, this.objAttrBuffer);
    // gl.bufferData(gl.UNIFORM_BUFFER,VOX_MEMORY_STRIDE,gl.DYNAMIC_DRAW);
    // //gl.bufferData(gl.UNIFORM_BUFFER, this.voxScreenMemory.buffer, gl.DYNAMIC_DRAW,0,VOX_MEMORY_STRIDE);
    // gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    // gl.bindBufferBase(gl.UNIFORM_BUFFER,0,this.objAttrBuffer);

    // 
    this.attribLocation = gl.getUniformLocation(program,'u_attrib');
    this.scaleLocation = gl.getUniformLocation(program,'u_scale');
    this.rotateLocation = gl.getUniformLocation(program,'u_rotate');
    this.rotate = mat3.create();
    this.objPositionLocation = gl.getUniformLocation(program,'u_obj_position');


    // ワールド・ビュー変換行列
    this.viewProjectionLocation = gl.getUniformLocation(program,'u_worldViewProjection');
    this.viewProjection = mat4.create();
    this.eyeLocation = gl.getUniformLocation(program,'u_eye');
    this.eye = vec3.create();
    vec3.set(this.eye,0,0,1);
    

    // 平行光源の方向ベクトル
    
    this.lightLocation = gl.getUniformLocation(program,'u_light');
    this.lightDirection = vec3.create();
    vec3.set(this.lightDirection,0,0,1);

    // 環境光
    this.ambient = vec3.create();
    this.ambientLocation = gl.getUniformLocation(program,'u_ambient');
    vec3.set(this.ambient,0.2,0.2,0.2);

    // カラーパレット
    this.palleteTexture = gl.createTexture();
    this.palleteLocation = gl.getUniformLocation(program,'u_pallete');
    
    //gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.bindTexture(gl.TEXTURE_2D, this.palleteTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, this.voxelModels.modelInfos.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.voxelModels.palletes);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.sampler = gl.createSampler();
    gl.samplerParameteri(this.sampler, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.samplerParameteri(this.sampler, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.count = 0;
      
  }

  // スプライトを描画
  render(screen) {
    const gl = this.gl;

    // プログラムの指定
    gl.useProgram(this.program);

    // VoxBufferの内容を更新
    //gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    //gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.voxBuffer);

    // VAOをバインド
    gl.bindVertexArray(this.vao);
    const memory = this.voxScreenMemory;
    const endian = this.endian;

    // カラーパレットをバインド
    gl.activeTexture(this.gl.TEXTURE0);
    gl.bindTexture(this.gl.TEXTURE_2D,this.palleteTexture);
    gl.bindSampler(0,this.sampler);
    gl.uniform1i(this.palleteLocation,0);

    mat4.multiply(this.viewProjection, screen.uniforms.viewProjection, this.worldMatrix);
    gl.uniformMatrix4fv(this.viewProjectionLocation, false,this.viewProjection);
    gl.uniform3fv(this.eyeLocation, this.eye);
    gl.uniform3fv(this.lightLocation, this.lightDirection);
    gl.uniform3fv(this.ambientLocation, this.ambient);
    

    for(let offset = 0,eo = memory.byteLength;offset < eo;offset += VOX_MEMORY_STRIDE){

      // 表示ビットが立っていたら表示    
      let attribute = memory.getUint32(offset + VOX_OBJ_ATTRIB,this.endian);  
      if( attribute & 0x80000000){

        // uniform変数を更新
        let axis = new Float32Array(memory.buffer,memory.byteOffset + offset + VOX_OBJ_AXIS,3);
        vec3.set(axis,1,-1,-1);
        vec3.normalize(axis,axis);
        let c = memory.getFloat32(offset + VOX_OBJ_ANGLE,endian) + 0.04;
        memory.setFloat32(offset + VOX_OBJ_ANGLE,c,endian);
        setRotate(this.rotate,memory.getFloat32(offset + VOX_OBJ_ANGLE,endian),axis);

        gl.uniform1f(this.scaleLocation,memory.getFloat32(offset + VOX_OBJ_SCALE,endian));
        gl.uniformMatrix3fv(this.rotateLocation,false,this.rotate);
        gl.uniform3fv(this.objPositionLocation,new Float32Array(memory.buffer,memory.byteOffset + offset + VOX_OBJ_POS,3));

        // UBO
        // gl.bindBuffer(gl.UNIFORM_BUFFER,this.objAttrBuffer);
        // gl.bufferSubData(gl.UNIFORM_BUFFER,0,this.voxScreenBuffer,offset,VOX_MEMORY_STRIDE);
        // gl.bindBuffer(gl.UNIFORM_BUFFER,null);

        const objInfo = this.voxelModels.modelInfos[(attribute & 0x1ff00000) >> 20];
        if(attribute & 0x20000){
          // use default pallet
          attribute = (attribute & 0b11111111111111111111111000000000) | objInfo.index;
          memory.setUint32(offset + VOX_OBJ_ATTRIB,attribute,endian);
        }

        gl.uniform1ui(this.attribLocation,memory.getUint32(offset + VOX_OBJ_ATTRIB,endian));

    
        // 描画命令の発行
        gl.drawArrays(gl.POINTS, objInfo.vindex,objInfo.count);

      }

    }
    this.count += 0.04;
  }

}


