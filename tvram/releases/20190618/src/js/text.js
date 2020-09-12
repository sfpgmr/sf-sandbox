'use strict';
import { fontData } from './mz700fon.js';
import { charCodes, canaCodes, hiraganaCodes } from './charCodes.js';
//import * as twgl from '../../twgl/twgl-full.js';
//import { glMatrix, mat2, mat2d, mat3, mat4, quat, vec2, vec3, vec4 } from '../../gl-matrix/gl-matrix.js';

//import *  as gameobj from './gameobj';
//import * as graphics from './graphics';

// ビットのMSBとLSBを入れ替えるメソッド
function rev(x) {
  x = x & 0xff;
  // 0bitと1bit、2bitと3bit、4bitと5bit、6bitと7ビットの反転
  x = ((x & 0x55) << 1) | ((x >>> 1) & 0x55);
  // 0-1bitと2-3bit、4-5bitと6-7bitの反転
  x = ((x & 0x33) << 2) | ((x >>> 2) & 0x33);
  // 0-3bit、4-7bitの反転
  x = ((x & 0x0F) << 4) | ((x >>> 4) & 0x0F);
  return x;
}

const vs =
  `#version 300 es
precision mediump int;
precision mediump float;


in vec2 position;
in vec2 texcoord;
out vec2 vtexcoord;

void main()	{
  gl_Position = vec4( position, 0.0,1.0 );
  vtexcoord = texcoord;
}
`;

const fs =
  `#version 300 es
precision mediump int;
precision mediump float;

uniform bool blink;
uniform sampler2D textBuffer;
uniform sampler2D attrBuffer;
uniform sampler2D font;
uniform sampler2D pallet;
uniform float vwidth;
uniform float vheight;

in vec2 vtexcoord;
out vec4 out_color;

// 文字表示
vec4 textPlane(void){
  // キャラクタコードを読み出し
  vec2 pos = vec2(vtexcoord.x, vtexcoord.y);

  float cc = min(texture(textBuffer, pos).r,0.99609375);

  // アトリビュートを読み出し

  uint attr = uint(texture(attrBuffer, pos).r * 255.0);
  
  // 表示対象の文字のビット位置を求める
  uint x = uint(vtexcoord.x * vwidth);
  x = 1u << (x & 7u);

  // 表示対象の文字のY位置を求める
  uint y = uint(vtexcoord.y * vheight);
  y = y & 7u;
  
  
  // フォントセットの選択
  uint fontAttr = (attr & 0x80u) >> 4u;

  // 文字色
  // uint ccolor = (attr & 0x70u) >> 4u;
  uint ccolor = uint(texture(pallet,vec2(float((attr & 0x70u) >> 4u) / 8.0,0.0)).r * 255.0);
 
  uint ccg = (ccolor & 0x4u);// bit 6
  uint ccr = (ccolor & 0x2u);// bit 5
  uint ccb = (ccolor & 0x1u);// bit 4

  // ブリンク
  bool attr_blink =  (attr & 0x8u) > 0u;// bit 3
  
  // 背景色
  uint bgcolor = uint(texture(pallet,vec2(float(attr & 0x7u)/8.0,0.0)).r * 255.0);

  uint bgg = (bgcolor & 0x4u);// bit 6
  uint bgr = (bgcolor & 0x2u);// bit 5
  uint bgb = (bgcolor & 0x1u);// bit 4

  // フォント読み出し位置
  vec2 fontpos = vec2(cc,float(y + fontAttr) / 16.0);

  // フォントデータの読み出し
  uint pixByte = uint(texture(font,fontpos).x * 255.0);
  
  // 指定位置のビットが立っているかチェック
  bool  pixBit = (pixByte & x) > 0u;
  
  // blinkの処理
  if(attr_blink && blink) return vec4(0.0);

  if(pixBit){
    // ビットが立っているときは、文字色を設定
    return vec4(ccr,ccg,ccb,1.0);
  }

  // ビットが立っていないときは背景色を設定
  float alpha = (bgg + bgr + bgb) == 0u ? 0.0 : 1.0;
  if(alpha == 0.0) discard;
  return vec4(bgr,bgg,bgb,alpha);
}

void main(){
  out_color = textPlane();
  //out_color = vec4(1.0,1.0,1.0,1.0);
  //out_color = uintBitsToFloat(texture(textBuffer, vtexcoord));
}
`;

/// テキストプレーン
export default class TextPlane {
  constructor(gl2, vwidth, vheight) {

    this.gl2 = gl2;
    const gl = this.gl = gl2.gl;

    this.charSize = 8;/* 文字サイズ pixel */

    this.vwidth = vwidth;
    this.vheight = vheight;

    this.twidth = vwidth / this.charSize;// テキストの横の文字数
    this.theight = vheight / this.charSize;// テキストの縦の文字数

    this.blinkCount = 0;// ブリンク制御用
    this.blink = false;// ブリンク制御用

    this.textBuffer = new Uint8Array(this.twidth * this.theight);// テキスト用VRAM
    this.attrBuffer = new Uint8Array(this.twidth * this.theight);// アトリビュート用VRAM

    // for(let i = 0,e = this.textBuffer.length;i < e;++i){
    //   this.textBuffer[i] = i & 0xff;
    // }
    //    this.textBuffer.fill(0x23);

    //this.attrBuffer.fill(0x70);

    class TextTexture {
      constructor({ location, unitNo = 0, cpubuffer, width, height, internalFormat = gl.R8, format = gl.RED, type = gl.UNSIGNED_BYTE, sampler = null }) {
        this.location = location;
        this.unitNo = unitNo;
        this.width = width;
        this.height = height;
        this.cpubuffer = cpubuffer;
        this.texture = gl.createTexture();
        this.internalFormat = internalFormat;
        this.format = format;
        this.type = type;
        this.sampler = sampler || (() => {
          const s = gl.createSampler();
          gl.samplerParameteri(s, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.samplerParameteri(s, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          return s;
        })();

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, cpubuffer, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      bind() {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
      }

      unbind() {
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      update() {
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, this.format, this.type, this.cpubuffer, 0);
      }

      activate() {
        gl.activeTexture(gl.TEXTURE0 + this.unitNo);
        this.bind();
        gl.bindSampler(this.unitNo, this.sampler);
        gl.uniform1i(this.location, this.unitNo);
      }

    }

    // シェーダーのセットアップ

    // this.programInfo = twgl.createProgramInfo(gl,[vs,fs]);
    const program = this.program = gl2.createProgram(vs, fs);
    gl.useProgram(program);

    this.positionLocation = gl.getAttribLocation(program, 'position');
    this.texcoordLocation = gl.getAttribLocation(program, 'texcoord');

    // VAOのセットアップ
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Text用ジオメトリのセットアップ //
    // インターリーブ形式
    this.bufferData = new Float32Array([
      // pos  texcoord
      -1.0, 1.0, 0.0, 1.0,
      1.0, 1.0, 1.0, 1.0,
      -1.0, -1.0, 0.0, 0.0,
      1.0, -1.0, 1.0, 0.0
    ]);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.bufferData, gl.STATIC_DRAW);
    const positionSize = this.positionSize = 2;
    const texcoordSize = this.texcoordSize = 2;
    const stride = this.stride = this.bufferData.BYTES_PER_ELEMENT * (positionSize + texcoordSize);
    const positionOffset = this.positionOffset = 0;
    const texcoordOffset = this.texcoordOffset = positionSize * this.bufferData.BYTES_PER_ELEMENT;

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, positionSize, gl.FLOAT, true, stride, positionOffset);

    gl.enableVertexAttribArray(this.texcoordLocation);
    gl.vertexAttribPointer(this.texcoordLocation, texcoordSize, gl.FLOAT, true, stride, texcoordOffset);

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 2, 1, 2, 3, 1]), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    // Uniform変数

    this.blinkLocation = gl.getUniformLocation(program, 'blink');
    this.textBufferLocation = gl.getUniformLocation(program, 'textBuffer');
    this.attrBufferLocation = gl.getUniformLocation(program, 'attrBuffer');
    this.fontLocation = gl.getUniformLocation(program, 'font');
    this.palletLocation = gl.getUniformLocation(program, 'pallet');
    this.vwidthLocation = gl.getUniformLocation(program, 'vwidth');
    this.vheightLocation = gl.getUniformLocation(program, 'vheight');

    // GPUにテキスト用VRAMを渡すためのテクスチャを作る
    this.textBufferTexture = new TextTexture({ location: this.textBufferLocation, unitNo: 0, cpubuffer: this.textBuffer, width: this.twidth, height: this.theight });

    // GPUにアトリビュート用VRAMを渡すためのテクスチャを作る

    this.textAttrTexture = new TextTexture({ location: this.attrBufferLocation, unitNo: 1, cpubuffer: this.attrBuffer, width: this.twidth, height: this.theight });

    // フォントのセットアップ
    this.fontTexWidth = 256;//128 * 2
    this.fontTexHeight = 16;//8 * 16 * 2;
    this.fontBuffer = new Uint8Array(this.fontTexWidth * this.fontTexHeight);

    // フォントデータの読み込み
    {
      let idx = 0;
      let offset = 0;
      fontData.forEach((d, i) => {
        offset = ((i / 256) | 0) * 8;
        idx = i % 256;
        d.forEach((byteChar, iy) => {
          let byte = parseInt(byteChar.replace(/　/ig, '0').replace(/■/ig, '1'), 2);
          this.fontBuffer[idx + (iy + offset) * 256] = rev(byte);
        });
      });
    }

    // フォント用テクスチャの生成

    this.textFontTexture = new TextTexture({ location: this.fontLocation, unitNo: 2, cpubuffer: this.fontBuffer, width: this.fontTexWidth, height: this.fontTexHeight });

    // パレットのセットアップ
    this.pallet = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);

    this.palletTexture = new TextTexture({ location: this.palletLocation, unitNo: 3, cpubuffer: this.pallet, width: this.pallet.length, height: 1 });

    this.sy = 0;//描画開始スタート位置

    //this.cls();
  }

  /// 画面消去
  cls() {
    this.textBuffer.fill(0);
    this.attrBuffer.fill(0);
    this.needsUpdate = true;

  }


  convertStr(str) {
    let attrs = [];
    let chars = [];
    for (let i = 0, e = str.length; i < e; ++i) {
      let code = str.charCodeAt(i);
      // 全角ひらがな
      if (code >= 0x3040 && code < 0x309f) {
        code -= 0x3041;
        const h = hiraganaCodes[code];
        chars.push(h[0]);
        attrs.push(0x80);
        // 濁点など
        if (h[1]) {
          chars.push(h[1]);
          attrs.push(0x80);
        }
      }
      // 全角カタカナ
      else if (code > 0x30A0 && code < 0x30FF) {
        code -= 0x30A1;
        const h = hiraganaCodes[code];
        chars.push(h[0]);
        attrs.push(0x00);
        // 濁点など
        if (h[1]) {
          chars.push(h[1]);
          attrs.push(0x00);
        }
      }
      else if (code >= 0xff60 && code < 0xffa0) {
        code -= 0xff60;
        const kana = canaCodes[code];
        chars.push(kana[0]);
        attrs.push(0);
      } else if (code < 0x80) {
        const ch = charCodes[code];
        chars.push(ch[0]);
        attrs.push(ch[1]);
      } else if (code < 0xff) {
        chars.push(code);
        attrs.push(0);
      }
    }
    return {
      chars: chars,
      attrs: attrs
    };
  }

  print(x, y, str, blink = false, color = 7, bgcolor = 0) {

    let { chars, attrs } = this.convertStr(str);

    if (x == this.CENTER) {
      // センタリング
      x = ((this.twidth - chars.length) / 2 + .5) | 0;
    } else if (x == this.LEFT) {
      // 左寄せ
      x = 0;
    } else if (x == this.RIGHT) {
      // 右寄せ
      x = this.twidth - chars.length;
    }

    let offset = x + y * this.twidth;
    const attr = color << 4 | bgcolor | (blink ? 0x8 : 0);


    for (let i = 0, e = chars.length; i < e; ++i) {

      let code = chars[i];
      if (code == 0xa) {
        y = this.addY(y);
        offset = y * this.twidth;
      }

      this.textBuffer[offset] = chars[i];
      this.attrBuffer[offset] = attr | attrs[i];

      ++offset;
      ++x;
      if (x == this.twidth) {
        x = 0;
        y = this.addY(y);
        offset = x + y * this.twidth;
      }
    }

    this.needsUpdate = true;


  }

  addY(y) {
    ++y;
    if (y == this.theight) {
      this.scroll();
      y = this.theight - 1;
    }
    return y;
  }

  scroll() {
    for (let y = (this.theight - 1) * this.twidth, ey = this.twidth; y > ey; ey += this.twidth) {
      const desty = y - this.twidth;
      for (let x = 0, ex = this.twidth; x < ex; ++x) {
        this.textBuffer[x + desty] = this.textBuffer[x + y];
        this.attrBuffer[x + desty] = this.attrBuffer[x + y];
      }
    }
  }

  fillText(x, y, w, h, str, blink = false, color = 7, bgcolor = 0, fillSpace = true) {

    let { chars, attrs } = this.convertStr(str);

    let end = w * h;

    const attr = color << 4 | bgcolor | (blink ? 0x8 : 0);

    if (fillSpace && chars.length < end) {
      while (chars.length <= end) {
        chars.push(0x00);
        attrs.push(attr);
      }
    }

    let spos = 0;
    end = chars.length;

    let cx = x, cy = y;
    let o = cy * this.twidth;
    while (spos <= end) {
      let code = chars[spos];
      if (code == 0xa) {
        ++cy;
        o = cy * this.twidth;
      } else {
        this.textBuffer[cx + o] = chars[spos];
        this.attrBuffer[cx + o] = attr | attrs[spos];
      }
      ++cx;
      if (cx > (x + w)) {
        cx = x;
        ++cy;
        o = cy * this.twidth;
      }
      ++spos;
    }

    this.needsUpdate = true;

  }

  /// テキストデータをもとにテクスチャーに描画する
  render() {
    const gl = this.gl;
    // const ctx = this.ctx;
    this.blinkCount = (this.blinkCount + 1) & 0xf;
    if (!this.blinkCount) {
      this.blink = !this.blink;
    }
    //this.uniforms.blink = this.blink;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    if (this.needsUpdate) {
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      this.textBufferTexture.bind();
      this.textBufferTexture.update();
      this.textAttrTexture.bind();
      this.textAttrTexture.update();
      this.palletTexture.bind();
      this.palletTexture.update();
      this.textFontTexture.bind();
      this.textFontTexture.update();
      this.palletTexture.unbind();
    }


    gl.uniform1f(this.blinkLocation, this.blink);
    gl.uniform1f(this.vwidthLocation, this.vwidth);
    gl.uniform1f(this.vheightLocation, this.vheight);

    this.textBufferTexture.activate();
    this.textAttrTexture.activate();
    this.textFontTexture.activate();
    this.palletTexture.activate();

    // twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
    // twgl.setUniforms(this.programInfo, this.uniforms);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
    this.needsUpdate = false;

  }
}

TextPlane.prototype.CENTER = Symbol('Center');
TextPlane.prototype.LEFT = Symbol('LEFT');
TextPlane.prototype.RIGHT = Symbol('RIGHT');

