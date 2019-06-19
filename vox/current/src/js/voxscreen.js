'use strict';
import { Node } from './scene.js';
import { mat4, vec3, vec4 } from './gl-matrix/gl-matrix.js';


const vertexShader = `#version 300 es
precision highp float;
precision highp int;
/**********************************************

Vox オブジェクトの表示

**********************************************/


// 座標 X,Y,Z
in vec3 position;
// カラー
in uint color;

// フラグメント・シェーダーに渡す変数
flat out vec4 v_color;// 色

#define root2 1.414213562

uniform mat4 u_worldViewProjection; // 変換行列
uniform float u_eye_z;// 視点のZ座標

void main() {
  
  // 色情報の取り出し
  v_color = vec4(float(color & 0xffu)/255.0,float((color >> 8) & 0xffu) /255.0,float((color >> 16) & 0xffu) / 255.0,float(color >> 24) / 255.0);

  // 表示位置の計算
  vec4 pos = u_worldViewProjection * vec4(position,1.0);

  gl_Position = pos;
  // セルサイズの計算
  gl_PointSize = cell_w = clamp(1.0 - 1.0 * float(pos.z),1.0,128.0);
}
`;

const fragmentShader = `#version 300 es
precision mediump float;
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


class Vox extends Node {
  constructor({ gl2, voxelData}) {
    super();
    let points = new ArrayBuffer(4 * 4 * voxelData.voxels.length);
    let offset = 0;
    
    voxelData.voxels.forEach(d=>{
      points[offset] = d.x / (data.size.x >> 1);
      offset+=4;
      points[offset+4] = (d.y / (data.size.y >> 1));
      points[offset+8] = (d.z / (data.size.z >> 1));
      let color = voxelData.pallet[d.colorIndex];
      points[offset+12] = (color.r << 24) | (color.g << 16)  | ( color.b << 8) | 0xff;
      offset += 16;
    });

    points
    
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
    gl.bufferData(gl.ARRAY_BUFFER, voxBuffer, gl.STATIC_DRAW);

    // 属性ロケーションIDの取得と保存
    this.positionLocation = gl.getAttribLocation(program, 'position');
    this.colorLocation = gl.getAttribLocation(program, 'color');

    this.stride =16;

    // 属性の有効化とシェーダー属性とバッファ位置の結び付け
    // 位置
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, this.VoxBuffer.POSITION_SIZE, gl.FLOAT, true, this.stride, 0);
    
    // 色
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribIPointer(this.colorLocation, this.VoxBuffer.COLOR_SIZE / 4, gl.UNSIGNED_INT, this.stride, 12);

    gl.bindVertexArray(null);

    // uniform変数の位置の取得と保存

    // ワールド・ビュー変換行列
    this.viewProjectionLocation = gl.getUniformLocation(program, 'u_worldViewProjection');
    // 視点のZ位置
    this.eyeZLocation = gl.getUniformLocation(program, 'u_eye_z');
    // テクスチャ
    this.textureLocation = gl.getUniformLocation(program, 'u_texture');
    // ビュー・投影行列
    this.viewProjection = mat4.create();
  }

  // スプライトを描画
  render(screen) {
    const gl = this.gl;

    // プログラムの指定
    gl.useProgram(this.program);

    // VoxBufferの内容を更新
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    //gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.VoxBuffer.buffer);

    // VAOをバインド
    gl.bindVertexArray(this.vao);

    // uniform変数を更新
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, mat4.multiply(this.viewProjection, screen.uniforms.viewProjection, this.worldMatrix));
    gl.uniform1f(this.eyeZLocation, screen.console.CAMERA_Z);

    // 描画命令の発行
    gl.drawArrays(gl.POINTS, 0, this.VoxBuffer.amount);
  }

}

export default Vox;
