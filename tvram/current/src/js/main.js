'use strict';

import {Console} from './console.js';
import {Model,SceneNode } from './vscreen.js';
import { vec3 } from '../../gl-matrix/gl-matrix.js';
import Sprite from './sprite.js';


window.addEventListener('load',async ()=>{
  const con = new Console();
  con.initConsole();
  const gl = con.gl;
  const gl2 = con.gl2;

  const testData = {
    position: [
      1, 1, -1,
      1, 1, 1,
      1, -1, 1,
      1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1],
    // normal:   [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1],
    texcoord: [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
    indices:  [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23],
    'position_size': 3,
    'stride': 20,
    'texcoord_size': 2
  };

  {
    const len = testData.position.length / 3;
    const d = [];
    const p = testData.position;
    const ind = testData.indices;
    for(let i = 0;i < len;++i){
      let pp = i * 3;
      let tp = i * 2;
      d.push(p[pp],p[pp+1],p[pp+2],ind[tp],ind[tp+1]);
    }
    
    testData.data = d;
    testData.drawInfos = [
      {
        count:testData.indices.length,
        material:{
          'u_diffuse': [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          'u_shininess': 50,
          'u_specular': [
            1.0,
            1.0,
            1.0,
            1.0
          ],
          'u_specularFactor': 1.0          
        },
        offset:0
      }
    ];
  }

  const data = await fetch('../res/Myship3.json').then((r)=>r.json());
  const spriteImg = await gl2.loadImage('../res/enemy.png');

  const spriteTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, spriteTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteImg);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const sprite = new Sprite({gl2:gl2,texture:spriteTexture,amount:8 * 8 * 8});
  initSprite(sprite);

  con.vscreen.appendScene(sprite);

  // const bufferInfo = twgl.createBufferInfoFromArrays(con, arrays);
  // const uniforms = {
  //   u_color:[1,1,1,1],
  //   u_specular: [1, 1, 1, 1],
  //   u_shininess: 50,
  //   u_specularFactor: 1,
  //   u_diffuse:[1,1,1,1],//  twgl.createTexture(gl, {
  //   //   min: gl.NEAREST,
  //   //   mag: gl.NEAREST,
  //   //   src: [
  //   //     192, 192, 96, 255,
  //   //     255, 255, 255, 255,
  //   //     192, 192, 192, 255,
  //   //     192, 96, 96, 255,
  //   //   ],
  //   // }),
  // };

  // const model = new Model(con,data);

  // const cube = new SceneNode(model);
  // cube.source.translation[2] = 0;
  // //m4.scale(cube.localMatrix,[20,20,20],cube.localMatrix);
  // cube.source.scale = vec3.fromValues(50,50,50);
  // con.vscreen.appendScene(cube);

  // const cube2 = new SceneNode(model);
  // cube2.source.translation = vec3.fromValues(2,0,0);

  // cube2.source.scale = vec3.fromValues(0.5,0.5,0.5);
  
  // con.vscreen.appendScene(cube2,cube);

  
  // WebAssembly側のメモリ
  let mem ;

  // コンパイル時に引き渡すオブジェクト
  // envというプロパティにエクスポートしたいものを入れる

  const exportToWasm = {
    env:{
      consoleLogString:consoleLogString,
      consoleValue:consoleValue,
      acos:Math.acos,
      acosh:Math.acosh,
      asin:Math.asin,
      asinh:Math.asinh,
      atan:Math.atan,
      atanh:Math.atanh,
      atan2:Math.atan2,
      cbrt:Math.cbrt,
      ceil:Math.ceil,
      clz32:Math.clz32,
      cos:Math.cos,
      cosh:Math.cosh,
      exp:Math.exp,
      expm1:Math.expm1,
      floor:Math.floor,
      fround:Math.fround,
      imul:Math.imul,
      log:Math.log,
      log1p:Math.log1p,
      log10:Math.log10,
      log2:Math.log2,
      pow:Math.pow,
      round:Math.round,
      sign:Math.sign,
      sin:Math.sin,
      sinh:Math.sinh,
      sqrt:Math.sqrt,
      tan:Math.tan,
      tanh:Math.tanh
     }
  };

  function consoleValue(v){
    console.log(v);
  }
  
  function consoleLogString(index) {

    // 先頭の4byte(uint32)に文字列の長さが入っている
    const length = mem.getUint32(index,true);

    // 文字列は長さの後に続けて入っている
    const array = new Uint16Array(mem.buffer,index + 4,length);
    const str = new TextDecoder('utf-16').decode(array);
    //const str = String.fromCharCode(...array);
    alert(str);
  }
  
  WebAssembly.instantiateStreaming(fetch("./wa/test.wasm"),exportToWasm).then(mod => {
    const test = mod.instance.exports.test;
    mem = new DataView(mod.instance.exports.memory.buffer);
    test();
  });

  let time = 0;
  function main(){
      time += 0.02;
      // cube.source.rotation[1] = time;
      // cube2.source.rotation[2] = time;
      sprite.source.rotation[0] = time/2;
      sprite.source.translation[2] = 60.0;
      sprite.source.rotation[1] = time/2;
      con.text.print(0,0,'WebGL2 Point Sprite ｦﾂｶｯﾀ Spriteﾋｮｳｼﾞ TEST',true,7,1);

      con.render(time);
      const spriteBuffer = sprite.spriteBuffer;
      for(let i = 0;i < 512;++i){
        const sgn = i & 1 ? -1 : 1; 
        spriteBuffer.setRotate(i,sgn * time * 2);
      }
      requestAnimationFrame(main);
  }
  main();
});

function initSprite(sprite){
  const spriteBuffer = sprite.spriteBuffer;
  const cellSize = 24;
  let idx = 0;
  //let z = 320;
  for(let z = -cellSize * 4 ,ez = cellSize * 4 ;z < ez;z += cellSize ){
    for(let y = -cellSize * 4,ey = cellSize * 4;y < ey;y += cellSize){
      for(let x = -cellSize * 4,ex = cellSize * 4;x < ex;x += cellSize){
        const pos = spriteBuffer.getPosition(idx);
        pos[0] = x;pos[1] = y;pos[2] = z;
        const color = spriteBuffer.getColor(idx);
        color[0] = color[1] = color[2] = color[3] = 0xff;
        spriteBuffer.setVisible(idx,true);
        spriteBuffer.setScale(idx,3);
        const cellPosSize = spriteBuffer.getCellPosSize(idx);
        cellPosSize[0] = 0 + (idx & 3) * 2;// x
        cellPosSize[1] = 4;// y
        cellPosSize[2] = 2;// * 8 = 32px: width
        cellPosSize[3] = 2;// don't use
        ++idx;
      }
    }
  }
}


