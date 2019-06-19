'use strict';
//import * as text from './text.js';
import EventEmitter from './eventEmitter3.js';
import  {vec3} from './gl-matrix/gl-matrix.js';
//import * as twgl from '../../twgl/twgl-full.js';
import GL2 from './gl2.js';
import Screen from './screen.js';
import VScreen from './voxscreen.js';
import TextPlane from './text2.js';

export class Console extends EventEmitter {
  constructor(virtualWidth = 240 , virtualHeight = 320) {
    super();
    this.VIRTUAL_WIDTH = virtualWidth;
    this.VIRTUAL_HEIGHT = virtualHeight;
    this.CONSOLE_WIDTH = 0;
    this.CONSOLE_HEIGHT = 0;
    this.RENDERER_PRIORITY = 100000 | 0;

    this.ANGLE_OF_VIEW = 45.0;
    this.V_RIGHT = this.VIRTUAL_WIDTH / 2.0;
    this.V_TOP = this.VIRTUAL_HEIGHT / 2.0;
    this.V_LEFT = -1 * this.VIRTUAL_WIDTH / 2.0;
    this.V_BOTTOM = -1 * this.VIRTUAL_HEIGHT / 2.0;
    this.CHAR_SIZE = 8;
    this.TEXT_WIDTH = this.VIRTUAL_WIDTH / this.CHAR_SIZE;
    this.TEXT_HEIGHT = this.VIRTUAL_HEIGHT / this.CHAR_SIZE;
    this.PIXEL_SIZE = 1;
    this.ACTUAL_CHAR_SIZE = this.CHAR_SIZE * this.PIXEL_SIZE;
    this.SPRITE_SIZE_X = 16.0;
    this.SPRITE_SIZE_Y = 16.0;
    this.CAMERA_Z = this.VIRTUAL_HEIGHT / (Math.tan(this.ANGLE_OF_VIEW / 360 * Math.PI) * 2);

    this.scale_ = 1.0;
    this.offset_ = vec3.create();

    this.renderer = null;
    this.stats = null;
    this.scene = null;
    this.camera = null;
    this.textPlane = null;
    this.position = this.POS_CENTER;
  }

  initConsole(textBitmap) {

    this.gl = document.querySelector('#c').getContext('webgl2');
    const gl = this.gl;
    const gl2 = this.gl2 = new GL2(this.gl);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    
    // this.renderer = new THREE.WebGLRenderer({ antialias: false, sortObjects: true });
    // const renderer = this.renderer;
    this.resize(false);

    // フレームバッファの作成
    const frameBuffer = this.frameBuffer = gl2.createFrameBuffer(this.VIRTUAL_WIDTH,this.VIRTUAL_HEIGHT);
    this.texture = this.frameBuffer.texture;
 
    gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.vscreen = new VScreen(this);
    this.text = new TextPlane(gl2,this.VIRTUAL_WIDTH,this.VIRTUAL_HEIGHT,textBitmap);
    this.screen = new Screen(this,this.texture);

    window.addEventListener('resize', this.resize.bind(this));

    // コンソールのセットアップ
  }

  resize(emit = true) {
    this.calcScreenSize();
    this.calcPosition();
    this.gl.canvas.width = this.gl.canvas.clientWidth;
    this.gl.canvas.height = this.gl.canvas.clientHeight;

//    twgl.resizeCanvasToDisplaySize(this.gl.canvas);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    emit && this.emit('resize', this);
  }

  get position() {
    return this.position_;
  }

  set position(v) {
    if (this.position_ == v) return;
    this.position_ = v;
    this.calcPosition();
  }

  calcPosition() {
    switch (this.position_) {
      case this.POS_CENTER:
        this.offsetX = 0;
        break;
      case this.POS_RIGHT:
        this.offsetX = 1.0 - this.CONSOLE_WIDTH / window.innerWidth * this.scale;
        break;
    }
  }

  initTextPlane() {
    //this.textPlane = new text.TextPlane(this.bufferScene,this.VIRTUAL_WIDTH,this.VIRTUAL_HEIGHT);
  }

  render(time) {

    const gl = this.gl;
    const frameBuffer = this.frameBuffer.frameBuffer;
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,frameBuffer);
    this.gl.viewport(0, 0, this.VIRTUAL_WIDTH, this.VIRTUAL_HEIGHT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0,0,0,0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.vscreen.render();
    this.text.render();

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    
    this.screen.render();
  }

  clear() {
    this.renderer.clear();
  }

  calcScreenSize() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    if (width >= height) {
      width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
      while (width > window.innerWidth) {
        --height;
        width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
      }
    } else {
      height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
      while (height > window.innerHeight) {
        --width;
        height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
      }
    }
    this.CONSOLE_WIDTH = width;
    this.CONSOLE_HEIGHT = height;
  }

  get scale() {
    return this.scale_;
  }

  set scale(v) {
    if (this.scale_ != v) {
      this.scale_ = v;
      this.resize();
    }
  }

  get offsetX() {
    return this.offset_.x;
  }

  set offsetX(v) {
    if (this.offset_.x != v) {
      this.offset_.x = v;
      //this.bufferMesh.position.setX(v);
    }
  }

  get offsetY() {
    return this.offset_.y;
  }

  set offsetY(v) {
    if (this.offset_.y != v) {
      this.offset_.y = v;
      //this.bufferMesh.position.setY(v);
    }
  }
}

Console.prototype.POS_CENTER = Symbol('POS_CENTER');
Console.prototype.POS_RIGHT = Symbol('POS_RIGHT');

export function checkVisibilityAPI() {
  // hidden プロパティおよび可視性の変更イベントの名前を設定
  if (typeof document.hidden !== "undefined") { // Opera 12.10 や Firefox 18 以降でサポート 
    this.hidden = "hidden";
    window.visibilityChange = "visibilitychange";
  } else if (typeof document.mozHidden !== "undefined") {
    this.hidden = "mozHidden";
    window.visibilityChange = "mozvisibilitychange";
  } else if (typeof document.msHidden !== "undefined") {
    this.hidden = "msHidden";
    window.visibilityChange = "msvisibilitychange";
  } else if (typeof document.webkitHidden !== "undefined") {
    this.hidden = "webkitHidden";
    window.visibilityChange = "webkitvisibilitychange";
  }
}

// export function calcScreenSize() {
//   var width = window.innerWidth;
//   var height = window.innerHeight;
//   if (width >= height) {
//     width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
//     while (width > window.innerWidth) {
//       --height;
//       width = height * this.VIRTUAL_WIDTH / this.VIRTUAL_HEIGHT;
//     }
//   } else {
//     height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
//     while (height > window.innerHeight) {
//       --width;
//       height = width * this.VIRTUAL_HEIGHT / this.VIRTUAL_WIDTH;
//     }
//   }
//   this.CONSOLE_WIDTH = width;
//   this.CONSOLE_HEIGHT = height;
// }


