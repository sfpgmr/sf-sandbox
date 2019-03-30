/**
 * @author SFPGMR
 */
 // Shader Sampleより拝借
 // https://github.com/mrdoob/three.js/blob/master/examples/webgl_shader.html
"use strict";

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
uniform vec2 resolution;
uniform float time;
varying vec2 vUv;
void main()	{

  vec2 p = -1.0 + 2.0 * gl_FragCoord.xy / resolution.xy;
  vec4 c1,c2;
  float a = time*40.0;
  float d,e,f,g=1.0/40.0,h,i,r,q;
  float c2v;
  e=400.0*(p.x*0.5+0.5);
  f=400.0*(p.y*0.5+0.5);
  i=200.0+sin(e*g+a/150.0)*20.0;
  d=200.0+cos(f*g/2.0)*18.0+cos(e*g)*7.0;
  r=sqrt(pow(abs(i-e),2.0)+pow(abs(d-f),2.0));
  q=f/r;
  e=(r*cos(q))-a/2.0;f=(r*sin(q))-a/2.0;
  d=sin(e*g)*176.0+sin(e*g)*164.0+r;
  h=((f+d)+a/2.0)*g;
  i=cos(h+r*p.x/1.3)*(e+e+a)+cos(q*g*6.0)*(r+h/3.0);
  h=sin(f*g)*144.0-sin(e*g)*212.0*p.x;
  h=(h+(f-e)*q+sin(r-(a+h)/7.0)*10.0+i/4.0)*g;
  i+=cos(h*2.3*sin(a/350.0-q))*184.0*sin(q-(r*4.3+a/12.0)*g)+tan(r*g+h)*184.0*cos(r*g+h);
  i=mod(i/5.6,256.0)/64.0;
  if(i<0.0) i+=4.0;
  if(i>=2.0) i=4.0-i;
  d=r/350.0;
  d+=sin(d*d*8.0)*0.52;
  f=(sin(a*g)+1.0)/2.0;
  c2 = texture2D( tDiffuse, vUv );
  c1 = vec4(vec3(f*i/1.6,i/2.0+d/13.0,i)*d*p.x+vec3(i/1.3+d/8.0,i/2.0+d/18.0,i)*d*(1.0-p.x),1.0);
  float alpha = c2.w;
  c2.w = 1.0;
  if(length(vec3(c2.x,c2.y,c2.z)) > 0.0 ) 
  {
    gl_FragColor = c2;
  } else {
    gl_FragColor = vec4(vec3(c1.x,c1.y,c1.z)* 0.17,1.0);
  }
}
`;

//     let geometry = new THREE.PlaneBufferGeometry( 1920, 1080 );
let uniforms = {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2() },
			time:       { value: 0.0 }
    };
//     uniforms.resolution.value.x = WIDTH;
//     uniforms.resolution.value.y = HEIGHT;
//     let material = new THREE.ShaderMaterial( {
//       uniforms: uniforms,
//       vertexShader: vertShader,
//       fragmentShader: fragShader
//     } );
//     let mesh = new THREE.Mesh( geometry, material );
//     mesh.position.z = -5000;
//     scene.add( mesh );
//   }

export default class SFShaderPass extends THREE.Pass {
	constructor(width,height){
		super();

		this.uniforms = THREE.UniformsUtils.clone( uniforms );
		this.uniforms.resolution.value.x = width;
		this.uniforms.resolution.value.y = height;
		this.material = new THREE.ShaderMaterial( {
			uniforms: this.uniforms,
			vertexShader: vertexShader,
			fragmentShader: fragmentShader
		} );

		this.camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1 );
		this.scene  = new THREE.Scene();

		this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
		this.scene.add( this.quad );

	}

  setSize(width,height){
		this.uniforms.resolution.value.x = width;
		this.uniforms.resolution.value.y = height;
  }

	render(renderer, writeBuffer, readBuffer, delta, maskActive){
		this.uniforms[ "tDiffuse" ].value = readBuffer.texture;
		this.quad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.render( this.scene, this.camera );

		} else {
			let backup = renderer.getRenderTarget();
			renderer.setRenderTarget(writeBuffer);
			this.clear && renderer.clear();
			renderer.render( this.scene, this.camera );
			renderer.setRenderTarget(backup);

			//renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		}

	}
}

