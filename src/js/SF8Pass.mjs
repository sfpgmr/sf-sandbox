/**
 * @author SFPGMR
 */
// Shader Sampleより拝借
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_shader.html
"use strict";
export default class SF8Pass extends THREE.Pass {
  constructor() {
    super();
    let uniforms = {
      tDiffuse: { value: null },
      colorbits: 1
    };
    let vertexShader =
      `
varying vec2 vUv;
void main()	{
		vUv = uv;
    gl_Position = vec4( position, 1.0 );
  }
`;
    let fragmentShader =
      `
uniform sampler2D tDiffuse;
uniform float colorbits;
varying vec2 vUv;
void main()	{
  vec4 c;
  c = texture2D( tDiffuse, vUv );
  //float a = c.w;
  //c = (step(0.25,c) + step(0.5,c) + step(0.75,c)) / 3.0;
  float b = exp2(colorbits);
  c = floor(c * b) / b;
  // c.w = 1.0;
  gl_FragColor = c;
}
`;

    this.uniforms = THREE.UniformsUtils.clone(uniforms);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    this.camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);
    this.scene = new THREE.Scene();

    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
    this.scene.add(this.quad);

  }

  render(renderer, writeBuffer, readBuffer, delta, maskActive) {
    this.uniforms["tDiffuse"].value = readBuffer.texture;
    this.uniforms["colorbits"].value = 4;
    
    this.quad.material = this.material;

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

