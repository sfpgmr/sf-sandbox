'use strict';

import { Console } from './console.js';
import { Vox, VoxelModel } from './voxscreen.js';
import { Map, MapModel } from './mapScreen.js';
import { mat4, mat3, vec3, vec2, vec4 } from './gl-matrix/gl-matrix.js';
import { path } from 'd3';


//import { voronoi } from 'd3';

// let display = true;
let play = false;

window.addEventListener('load', () => {

  let playButton = document.getElementById('playbutton');
  playButton.addEventListener('click', function () {
    if (!play) {
      playButton.setAttribute('class', 'hidden');
      play = true;
      start();
    }
  });

});

async function start() {
  try {
    const con = new Console(192, 256);

    const textBitmap = new Uint8Array(
      await fetch('./font.bin')
        .then(r => r.arrayBuffer()));

    const memory = new ArrayBuffer(con.MEMORY_SIZE_NEEDED + Vox.prototype.MEMORY_SIZE_NEEDED);

    let offset = 0;
    con.initConsole({ textBitmap: textBitmap, memory: memory, offset: offset });
    offset += con.MEMORY_SIZE_NEEDED;
    const gl = con.gl;
    const gl2 = con.gl2;

    //const voxmodel = new Vox({gl2:gl2,data:await loadVox('myship.bin')});
    const voxelModels = await VoxelModel.loadFromUrls([
      'cube.bin',
      'myship.bin',
      'q.bin',
      'q1.bin',
      'chr.bin'
    ]);

    const vox = new Vox({ gl2: gl2, voxelModels: voxelModels, memory: memory, offset: offset });
    let count = 1;

    for (let y = 8, offset = 0; y < con.VIRTUAL_HEIGHT; y += 16) {
      for (let x = 8; x < con.VIRTUAL_WIDTH; x += 16) {
        const vmem = vox.voxScreenMemory;
        vmem.setUint32(offset + vox.VOX_OBJ_ATTRIB, 0x8003fc00 | count++ | (0), vox.endian);
        vmem.setFloat32(offset + vox.VOX_OBJ_SCALE, 0.7, vox.endian);
        vmem.setFloat32(offset + vox.VOX_OBJ_POS, x - con.VIRTUAL_WIDTH / 2, vox.endian);
        vmem.setFloat32(offset + vox.VOX_OBJ_POS + vox.SIZE_PARAM, y - con.VIRTUAL_HEIGHT / 2, vox.endian);
        vmem.setFloat32(offset + vox.VOX_OBJ_POS + vox.SIZE_PARAM * 2, 0, vox.endian);
        vmem.setFloat32(offset + vox.VOX_OBJ_ANGLE, count, vox.endian);
        offset += vox.VOX_MEMORY_STRIDE;
      }
    }

    //const myship = new SceneNode(model);

    const map = new Map({ gl2: gl2, mapModels: await MapModel.load() });
    con.vscreen.appendScene(map);
    const pathWay = (await (await fetch('./scrollMap.json')).json()).features[0].geometry.coordinates.map(d => vec2.fromValues(d[0], d[1]));
    const pathVector = [];

    pathWay.reduce((prev, curr, i) => {
      const pathVec = {};
      pathVec.start = prev;
      pathVec.end = curr;
      //console.log(prev,curr,i);
      pathVec.dist = vec2.sub(vec2.create(), curr, prev);
      pathVec.dir = vec2.normalize(vec2.create(), pathVec.dist);
      pathVec.angle = Math.atan2(pathVec.dir[1], pathVec.dir[0]);
      pathVec.dir[0] *= 0.000001;
      pathVec.dir[1] *= 0.000001;
      pathVec.count = (((pathVec.dist[0] / pathVec.dir[0]))) | 0;

      if (prev.prevAngle) {
        const angleSpeed = 0.0004;
        pathVec.prevAngle = prev.prevAngle;
        let a = prev.prevAngle - pathVec.angle;
        if (a) {
          if (a < 0) a += Math.PI * 2;
          if (a >= Math.PI * 2) a -= Math.PI * 2;
          if (a < Math.PI) {
            pathVec.angleDir = -angleSpeed;
          } else {
            pathVec.angleDir = angleSpeed;
            a = 2 * Math.PI - a;
          }
          pathVec.angleCount = (a / angleSpeed) | 0;
          if (pathVec.angleCount > pathVec.count) {
            pathVec.angleCount = pathVec.count;
            if (pathVec.angleDir >= 0) {
              pathVec.angleDir = (a / pathVec.count);
            } else {
              pathVec.angleDir = -(a / pathVec.count);
            }
          }
        } else {
          pathVec.angleCount = 0;
        }
      }
      pathVector.push(pathVec);
      curr.prevAngle = pathVec.angle;
      return curr;
    });

    function* ScrollPosIterator() {
      let angle = pathVector[0].angle;
      for (const path of pathVector) {
        let x = path.start[0];
        let y = path.start[1];

        let angleCount = path.angleCount || 0;
        let angleDir = path.angleDir;

        yield { x: x, y: y, angle: angle };

        for (let i = 0; i < path.count; ++i) {
          if (angleCount) {
            //        while(angleCount){
            angle += angleDir;
            //          yield {x:x,y:y,angle:angle};
            --angleCount;
            //      }
          } else {
            angle = path.angle;
          }
          x += path.dir[0];
          y += path.dir[1];
          yield { x: x, y: y, angle: angle };
        }
        angle = path.angle;
      }
    }

    let scrollPos = ScrollPosIterator();



    // const scrollManager = {
    //   current:pathVector[0]

    // };

    //con.vscreen.appendScene(vox);

    // cube.source.translation[2] = 0;
    // //m4.scale(cube.localMatrix,[20,20,20],cube.localMatrix);
    // cube.source.scale = vec3.fromValues(50,50,50);
    // con.vscreen.appendScene(cube);

    // const cube2 = new SceneNode(model);
    // cube2.source.translation = vec3.fromValues(2,0,0);

    // cube2.source.scale = vec3.fromValues(0.5,0.5,0.5);

    // con.vscreen.appendScene(cube2,cube);


    // WebAssembly側のメモリ
    let mem;

    // コンパイル時に引き渡すオブジェクト
    // envというプロパティにエクスポートしたいものを入れる

    const exportToWasm = {
      env: {
        consoleLogString: consoleLogString,
        consoleValue: consoleValue,
        acos: Math.acos,
        acosh: Math.acosh,
        asin: Math.asin,
        asinh: Math.asinh,
        atan: Math.atan,
        atanh: Math.atanh,
        atan2: Math.atan2,
        cbrt: Math.cbrt,
        ceil: Math.ceil,
        clz32: Math.clz32,
        cos: Math.cos,
        cosh: Math.cosh,
        exp: Math.exp,
        expm1: Math.expm1,
        floor: Math.floor,
        fround: Math.fround,
        imul: Math.imul,
        log: Math.log,
        log1p: Math.log1p,
        log10: Math.log10,
        log2: Math.log2,
        pow: Math.pow,
        round: Math.round,
        sign: Math.sign,
        sin: Math.sin,
        sinh: Math.sinh,
        sqrt: Math.sqrt,
        tan: Math.tan,
        tanh: Math.tanh
      }
    };

    function consoleValue(v) {
      console.log(v);
    }

    function consoleLogString(index) {

      // 先頭の4byte(uint32)に文字列の長さが入っている
      const length = mem.getUint32(index, true);

      // 文字列は長さの後に続けて入っている
      const array = new Uint16Array(mem.buffer, index + 4, length);
      const str = new TextDecoder('utf-16').decode(array);
      //const str = String.fromCharCode(...array);
      alert(str);
    }

    // WebAssembly.instantiateStreaming(fetch("./wa/test.wasm"),exportToWasm).then(mod => {
    //   const test = mod.instance.exports.test;
    //   mem = new DataView(mod.instance.exports.memory.buffer);
    //   test();
    // });

    let prevx = 0;
    let time = 0;
    function main() {
      let v = scrollPos.next();
      if (!v.done) {
        map.x = v.value.x;
        map.y = v.value.y;
        map.angle = v.value.angle;
        console.log(v.value.x - prevx);
        prevx = v.value.x;
      }
      time += 0.02;
      // cube.source.rotation[1] = time;
      // cube2.source.rotation[2] = time;
      // sprite.source.rotation[0] = time/2;
      // sprite.source.translation[2] = 60.0;
      // sprite.source.rotation[1] = time/2;
      //con.text.print(0,0,'WebGL2 Point Sprite ｦﾂｶｯﾀ Spriteﾋｮｳｼﾞ TEST',true,7,1);
      con.render(time);
      // const spriteBuffer = sprite.spriteBuffer;
      // for(let i = 0;i < 512;++i){
      //   const sgn = i & 1 ? -1 : 1; 
      //   spriteBuffer.setRotate(i,sgn * time * 2);
      // }
      requestAnimationFrame(main);
    }
    main();
  } catch (e) {
    throw e;
    //alert(e.stack);
  }
}

// function initSprite(sprite){
//   const spriteBuffer = sprite.spriteBuffer;
//   const cellSize = 24;
//   let idx = 0;
//   //let z = 320;
//   for(let z = -cellSize * 4 ,ez = cellSize * 4 ;z < ez;z += cellSize ){
//     for(let y = -cellSize * 4,ey = cellSize * 4;y < ey;y += cellSize){
//       for(let x = -cellSize * 4,ex = cellSize * 4;x < ex;x += cellSize){
//         const pos = spriteBuffer.getPosition(idx);
//         pos[0] = x;pos[1] = y;pos[2] = z;
//         const color = spriteBuffer.getColor(idx);
//         color[0] = color[1] = color[2] = color[3] = 0xff;
//         spriteBuffer.setVisible(idx,true);
//         spriteBuffer.setScale(idx,3);
//         const cellPosSize = spriteBuffer.getCellPosSize(idx);
//         cellPosSize[0] = 0 + (idx & 3) * 2;// x
//         cellPosSize[1] = 4;// y
//         cellPosSize[2] = 2;// * 8 = 32px: width
//         cellPosSize[3] = 2;// don't use
//         ++idx;
//       }
//     }
//   }
// }


