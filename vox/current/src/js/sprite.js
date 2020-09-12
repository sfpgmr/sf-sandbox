'use strict';
import { Node } from './scene.js';
import { mat4, vec3, vec4 } from './gl-matrix/gl-matrix.js';


const vertexShader = `#version 300 es
precision mediump float;
precision highp int;
/**********************************************

ポイントスプライト利用による2Dスプライト描画

**********************************************/


// 座標 X,Y,Z
in vec3 position;
// XY平面の回転角度（ラジアン）
in float rotate;
// スプライト色 RGBAを8ビットで指定
in uint color;
// セル指定
// CELL_X,CELL_Y,CELL_W,CELL_H(CELL_Hは未使用)
in uint cell_pos_size;
// 16bit目 ... 表示・非表示のフラグ
// 0-15bit ... 拡大縮小(固定小数点8bit.8bit)
in uint attr;// visible,scale

// フラグメント・シェーダーに渡す変数
flat out vec4 v_color;// 色
flat out int v_visible;// 表示・非表示
flat out ivec4 v_cell;// セルの開始位置・削除
flat out vec3  v_rotate;// 回転角度

#define root2 1.414213562

uniform mat4 u_worldViewProjection; // 変換行列
uniform float u_eye_z;// 視点のZ座標

void main() {
  
  // 色情報の取り出し
  v_color = vec4(float(color & 0xffu)/255.0,float((color >> 8) & 0xffu) /255.0,float((color >> 16) & 0xffu) / 255.0,float(color >> 24) / 255.0);
  // 表示情報の取り出し
  v_visible = (attr & 0x00010000u) != 0u ? 1:0;

  // 拡大・縮小情報の取り出し
  float scale = float(attr & 0xffffu) / 256.0;
  // 回転角度の取り出しと、sin/cos値の計算
  v_rotate.x = rotate;
  v_rotate.y = sin(rotate);
  v_rotate.z = cos(rotate);

  // セル位置とセルの幅（大きさ）の取り出し(8px単位で指定)
  // +-------------------------------------------------------------+
  // +                                                             +
  // +       (v_cell.x,v_cell.y)                                   +
  // +             *----------+                                    +
  // +             +----------+                                    +
  // +             +----------+                                    +
  // +             +----------*                                    +
  // +                   (v_cell.x + v_cell.z,v_cell.y + v_cell.z) +
  // +                                                             +
  // +                                                             +
  // +                                                             +
  // +-------------------------------------------------------------+
  v_cell.x = int((cell_pos_size << 3u) & 0x7f8u);// x
  v_cell.y = int((cell_pos_size >> 5u) & 0x7f8u);// y
  v_cell.z = int((cell_pos_size >> 13u) & 0x7f8u);// width

  // 表示位置の計算
  vec4 pos = u_worldViewProjection * vec4(position,1.0);
  gl_Position = pos;
  float cell_w = float(v_cell.z) * scale;

  // セルサイズを計算
  // ルート2倍するのは、回転を考慮しているため
  gl_PointSize = clamp((-cell_w / u_eye_z * pos.z + cell_w) * root2,1.,128.);

}
`;

const fragmentShader = `#version 300 es
precision mediump float;
precision highp int;

// テクスチャ・サンプラ
uniform sampler2D u_texture;

// 頂点シェーダーからの情報
flat in vec4 v_color;// スプライト色
flat in int v_visible;// 表示
flat in ivec4 v_cell;// セルの座標位置・幅（大きさ）
flat in vec3  v_rotate;// 回転角度


#define root2 1.414213562

// 出力色
out vec4 fcolor;

void main() {

  // 表示フラグのチェック
  if(v_visible == 0) discard;

  // 中心点が0.0になるようにcoordを調整する
  vec2 coord = gl_PointCoord - 0.5;
  // ルート2倍する
  coord *= root2;

  // Z軸で回転（XY平面で回転）
  float s = v_rotate.y;
  float c = v_rotate.z;

  vec2 coord2 = vec2(
    coord.x * c - coord.y * s,
    coord.x * s + coord.y * c
  );
  
  // 回転の結果はみ出た部分は描画しない
  if(coord2.x < -0.5 || coord2.x > 0.5 || coord2.y < -0.5 || coord2.y > 0.5) {
    //fcolor = vec4(1.0,0.0,0.0,0.8);
    discard;
  }
  // 中心点をもとに戻す
  coord = coord2 + 0.5;

  // セル幅
  float w = float(v_cell.z);

  // 指定位置・幅でテクスチャをフェッチする
  fcolor = texelFetch(u_texture,ivec2(v_cell.x + int(w * coord.x) ,v_cell.y + int(-w * coord.y)),0) * v_color;

  // αが0の場合描画しない（カラーキーのかわり）
  if(fcolor.a == 0.0) discard;

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


// スプライトバッファ
class SpriteBuffer {
  constructor(amount) {
    ;
    // Strideの計算
    this.stride = Float32Array.BYTES_PER_ELEMENT * (3 + 1) + Uint32Array.BYTES_PER_ELEMENT * (1 + 1 + 1);
    // スプライトの枚数
    this.amount = amount;
    // バッファの生成
    this.buffer = new ArrayBuffer(amount * this.stride);
    // DataView
    this.view = new DataView(this.buffer);
    // エンディアンのチェック
    this.littleEndian = checkEndian(this.buffer);

    // 表示フラグの初期化
    for (let i = 0, e = this.amount; i < e; ++i) {
      this.setVisible(i, false);
    }

  }

  // 位置ビューの取得
  getPosition(i) {
    return new Float32Array(this.buffer, this.stride * i, 3);
  }

  // 回転角度の取得
  getRotate(i) {
    return this.view.getFloat32(this.stride * i + this.ROTATE_OFFSET, this.littleEndian);
  }

  // 回転角度の設定
  setRotate(i,v) {
    return this.view.setFloat32(this.stride * i + this.ROTATE_OFFSET,v, this.littleEndian);
  }

  // 色情報ビューの取得
  getColor(i) {
    return new Uint8ClampedArray(this.buffer, this.stride * i + this.COLOR_OFFSET, 4);
  }

  // 表示・非表示フラグ状態の取得
  getVisible(i) {
    return this.view.getUint32(this.stride * i + this.ATTRIBUTE_OFFSET, this.littleEndian) & 0x00010000;
  }

  // 表示・非表示フラグ状態の設定
  setVisible(i, v) {
    const o = this.stride * i + this.ATTRIBUTE_OFFSET;
    let va = this.view.getUint32(o, this.littleEndian);
    v ?
      this.view.setUint32(this.stride * i + this.ATTRIBUTE_OFFSET, va | 0x00010000, this.littleEndian)
      : this.view.setUint32(this.stride * i + this.ATTRIBUTE_OFFSET, va & 0xfffeffff, this.littleEndian);
  }

  // 拡大・縮小率の取得
  getScale(i) {
    return (this.view.getUint32(this.stride * i + this.ATTRIBUTE_OFFSET, this.littleEndian) & 0xffff) ;
  }

  // 拡大・縮小率の設定
  setScale(i, v) {
    const vb = v * 256.0 & 0xffff;
    const o = this.stride * i + this.ATTRIBUTE_OFFSET;
    let va = (this.view.getUint32(o, this.littleEndian) & 0x00010000) | vb;
    this.view.setUint32(o, va, this.littleEndian);
  }

  // セル位置・セル幅（大きさ）情報の取得
  getCellPosSize(i) {
    return new Uint8Array(this.buffer, this.stride * i + this.CELL_OFFSET, 4);
  }

}

// 各バッファ属性のサイズ
SpriteBuffer.prototype.POSITION_SIZE = 3;// 位置
SpriteBuffer.prototype.ROTATE_SIZE = 1;// 回転角度
SpriteBuffer.prototype.COLOR_SIZE = 4;// スプライト色
SpriteBuffer.prototype.CELL_SIZE = 4;//セルの位置、幅指定
SpriteBuffer.prototype.ATTRIBUTE_SIZE = 1;// 拡大縮小・非表示属性
// 各バッファ属性のオフセット
SpriteBuffer.prototype.POSITION_OFFSET = 0;
SpriteBuffer.prototype.ROTATE_OFFSET = SpriteBuffer.prototype.POSITION_SIZE * Float32Array.BYTES_PER_ELEMENT;
SpriteBuffer.prototype.COLOR_OFFSET = SpriteBuffer.prototype.ROTATE_OFFSET + SpriteBuffer.prototype.ROTATE_SIZE * Float32Array.BYTES_PER_ELEMENT;
SpriteBuffer.prototype.CELL_OFFSET = SpriteBuffer.prototype.COLOR_OFFSET + SpriteBuffer.prototype.COLOR_SIZE * Uint8Array.BYTES_PER_ELEMENT;
SpriteBuffer.prototype.ATTRIBUTE_OFFSET = SpriteBuffer.prototype.CELL_OFFSET + SpriteBuffer.prototype.CELL_SIZE * Uint8Array.BYTES_PER_ELEMENT;

// ポイントスプライトを使用したスプライト画面クラス
class Sprite extends Node {
  constructor({ gl2, texture,  amount = 1024, visible = true }) {
    super();

    // スプライト面の表示・非表示
    this.visible = visible;

    // webgl コンテキストの保存
    const gl = this.gl = gl2.gl;
    this.gl2 = gl2;

    // スプライトバッファの作成
    this.spriteBuffer = new SpriteBuffer(amount);

    // テクスチャの保存
    this.texture = texture;

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
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteBuffer.buffer, gl.DYNAMIC_DRAW);

    // 属性ロケーションIDの取得と保存
    this.positionLocation = gl.getAttribLocation(program, 'position');
    this.rotateLocation = gl.getAttribLocation(program, 'rotate');
    this.colorLocation = gl.getAttribLocation(program, 'color');
    this.cellPosSizeLocation = gl.getAttribLocation(program, 'cell_pos_size');
    this.attributeLocation = gl.getAttribLocation(program, 'attr');

    this.stride = this.spriteBuffer.stride;

    // 属性の有効化とシェーダー属性とバッファ位置の結び付け
    // 位置
    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, this.spriteBuffer.POSITION_SIZE, gl.FLOAT, true, this.stride, this.spriteBuffer.POSITION_OFFSET);
    
    // 回転角度 
    gl.enableVertexAttribArray(this.rotateLocation);
    gl.vertexAttribPointer(this.rotateLocation, this.spriteBuffer.ROTATE_SIZE, gl.FLOAT, true, this.stride, this.spriteBuffer.ROTATE_OFFSET);

    // スプライト色
    gl.enableVertexAttribArray(this.colorLocation);
    gl.vertexAttribIPointer(this.colorLocation, this.spriteBuffer.COLOR_SIZE / 4, gl.UNSIGNED_INT, this.stride, this.spriteBuffer.COLOR_OFFSET);

    // テクスチャのセルの位置および幅
    gl.enableVertexAttribArray(this.cellPosSizeLocation);
    gl.vertexAttribIPointer(this.cellPosSizeLocation, this.spriteBuffer.CELL_SIZE / 4, gl.UNSIGNED_INT, this.stride, this.spriteBuffer.CELL_OFFSET);

    // 拡大・縮小スケーリングとスプライトの表示・非表示フラグ 
    gl.enableVertexAttribArray(this.attributeLocation);
    gl.vertexAttribIPointer(this.attributeLocation, this.spriteBuffer.ATTRIBUTE_SIZE, gl.UNSIGNED_INT, this.stride, this.spriteBuffer.ATTRIBUTE_OFFSET);

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

    // SpriteBufferの内容を更新
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.spriteBuffer.buffer);

    // VAOをバインド
    gl.bindVertexArray(this.vao);

    // uniform変数を更新
    gl.uniformMatrix4fv(this.viewProjectionLocation, false, mat4.multiply(this.viewProjection, screen.uniforms.viewProjection, this.worldMatrix));
    gl.uniform1f(this.eyeZLocation, screen.console.CAMERA_Z);

    // テクスチャの有効化とバインド
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    //gl.disable(gl.DEPTH_TEST);
    // 描画命令の発行
    gl.drawArrays(gl.POINTS, 0, this.spriteBuffer.amount);

  }

}

export default Sprite;
