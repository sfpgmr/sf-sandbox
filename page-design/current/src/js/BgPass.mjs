/**
 * @author SFPGMR
 */
"use strict";

const NUM_X = 16, NUM_Y = 12;
const NUM_OBJS = NUM_X * NUM_Y;

const vs =
  `#version 300 es
out vec2 vUv;
void main()	{
  vUv = uv;
  gl_Position = vec4(position,1.0);
}
`;

const fs =
  `#version 300 es
precision highp float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D tex;
uniform sampler2D tex2;

in vec2 vUv;
out vec4 flagColor;
void main(){
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  vec2 p2 = gl_FragCoord.xy / resolution;
  
  vec4 c1 = texture2D(tex,p2);
  vec4 c2 = texture2D(tex2,p2);
  float s = (sin(time * 0.25) + 1.0) / 2.0;
  //flagColor = vec4(0.02 / abs(abs(sin(time)) - length(p)),0.0,0.0,1.0);
  flagColor = c1 * s + c2 * (1.0 - s);
}
`;

class BgPass extends THREE.Pass {
  constructor(width, height) {
    super();

    const scene = this.scene = new THREE.Scene();

    // カメラの作成
    const camera = this.camera = new THREE.OrthographicCamera(-width / 2, -height / 2, width / 2, height / 2);

    const loader = new THREE.TextureLoader();
      
    function loadTexture(path){
      return new Promise((resolve,reject)=>{
        loader.load(path,texture=>{
          resolve(texture);
        },null,error=>{reject(error);});
      });
    }

    const self_ = this;
    const geomertry = self_.geomertry = new THREE.PlaneBufferGeometry(width, height, 1, 1);

    this.init = Promise.all([loadTexture('./image-001.JPG'),loadTexture('./image-002.JPG')])
      .then(textures=>{
        self_.texture = textures[0];
        self_.texture2 = textures[1];
        const material = self_.material = new THREE.ShaderMaterial(
          {
            vertexShader: vs,
            fragmentShader: fs,
            uniforms: {
              time: { value: 0.0 },
              resolution: { value: new THREE.Vector2(width, height) },
              tex: {value : self_.texture },
              tex2: {value : self_.texture2 }
            }
          });
          const mesh = self_.mesh = new THREE.Mesh(geomertry, material);
          self_.scene.add(mesh);
      });
    this.width = width;
    this.height = height;
    this.time = 0.0;
  }


  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.material.uniforms.resolution.value.x = width;
    this.material.uniforms.resolution.value.y = height;
    this.material.uniforms.needsUpdate = true;
  }


  update() {
    this.time += 0.025;
    this.material.uniforms.time.value = this.time;
    this.material.uniforms.needsUpdate = true;
  }


  render(renderer, writeBuffer, readBuffer, delta, maskActive) {

    if (this.renderToScreen) {
      renderer.render(this.scene, this.camera);
    } else {
      let backup = renderer.getRenderTarget();
      renderer.setRenderTarget(writeBuffer);
      this.clear && renderer.clear();
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(backup);

      //renderer.render(this.scene, this.camera, writeBuffer, this.clear);

    }

  }
}


export default async function createBGPass(width, height) {
  let obj = new BgPass(width, height);
  await obj.init;
  return obj;
}