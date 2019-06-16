'use strict';

const crtVShader =
  `#version 300 es
 precision mediump float;
 in vec2 position;
 in vec2 texcoord;
 
 out vec2 o_texcoord;


void main()	{
    o_texcoord = texcoord;
    gl_Position = vec4(position,0.0,1.0);   
  }
`;

const crtFShader =
  `#version 300 es
precision mediump float;

uniform sampler2D map;
uniform vec2 resolution;
uniform float time;

in vec2 o_texcoord;
out vec4 out_color;

#define RGBA(r, g, b, a)	vec4(float(r)/255.0, float(g)/255.0, float(b)/255.0, float(a)/255.0)

const vec3 kBackgroundColor = RGBA(0x00, 0x00, 0x00, 0x00).rgb; // medium-blue sky
//const vec3 kBackgroundColor = RGBA(0xff, 0x00, 0xff, 0xff).rgb; // test magenta

// Emulated input resolution.
// Fix resolution to set amount.
// Note: 256x224 is the most common resolution of the SNES, and that of Super Mario World.
vec2 res = vec2(
  240.0 / 1.0,
  320.0 / 1.0
);

// Hardness of scanline.
//	-8.0 = soft
// -16.0 = medium
float sHardScan = -8.0;

// Hardness of pixels in scanline.
// -2.0 = soft
// -4.0 = hard
const float kHardPix = -3.0;

// Display warp.
// 0.0 = none
// 1.0 / 8.0 = extreme
const vec2 kWarp = vec2(1.0 / 32.0, 1.0 / 24.0);
//const vec2 kWarp = vec2(0);

// Amount of shadow mask.
float kMaskDark = 0.5;
float kMaskLight = 1.5;

//------------------------------------------------------------------------

// sRGB to Linear.
// Assuing using sRGB typed textures this should not be needed.
float toLinear1(float c) {
	return (c <= 0.04045) ?
		(c / 12.92) :
		pow((c + 0.055) / 1.055, 2.4);
}
vec3 toLinear(vec3 c) {
	return vec3(toLinear1(c.r), toLinear1(c.g), toLinear1(c.b));
}

// Linear to sRGB.
// Assuing using sRGB typed textures this should not be needed.
float toSrgb1(float c) {
	return(c < 0.0031308 ?
		(c * 12.92) :
		(1.055 * pow(c, 0.41666) - 0.055));
}
vec3 toSrgb(vec3 c) {
	return vec3(toSrgb1(c.r), toSrgb1(c.g), toSrgb1(c.b));
}

// Nearest emulated sample given floating point position and texel offset.
// Also zero's off screen.
vec4 fetch(vec2 pos, vec2 off)
{
	pos = floor(pos * resolution + off) / resolution;
	if (max(abs(pos.x - 0.5), abs(pos.y - 0.5)) > 0.5)
		return vec4(vec3(0.0), 0.0);
   	
//    vec4 sampledColor = texture(iChannel0, pos.xy, -16.0);
    vec4 sampledColor = texture(map, pos.xy, -16.0);
    
    sampledColor = vec4(
        (sampledColor.rgb * sampledColor.a) +
        	(kBackgroundColor * (1.0 - sampledColor.a)),
        1.0
    );
    
	return vec4(
        toLinear(sampledColor.rgb),
        sampledColor.a
    );
}

// Distance in emulated pixels to nearest texel.
vec2 dist(vec2 pos) {
	pos = pos * res;
	return -((pos - floor(pos)) - vec2(0.5));
}

// 1D Gaussian.
float gaus(float pos, float scale) {
	return exp2(scale * pos * pos);
}

// 3-tap Gaussian filter along horz line.
vec3 horz3(vec2 pos, float off)
{
	vec3 b = fetch(pos, vec2(-1.0, off)).rgb;
	vec3 c = fetch(pos, vec2( 0.0, off)).rgb;
	vec3 d = fetch(pos, vec2(+1.0, off)).rgb;
	float dst = dist(pos).x;
	// Convert distance to weight.
	float scale = kHardPix;
	float wb = gaus(dst - 1.0, scale);
	float wc = gaus(dst + 0.0, scale);
	float wd = gaus(dst + 1.0, scale);
	// Return filtered sample.
	return (b * wb + c * wc + d * wd) / (wb + wc + wd);
}

// 5-tap Gaussian filter along horz line.
vec3 horz5(vec2 pos, float off)
{
	vec3 a = fetch(pos, vec2(-2.0, off)).rgb;
	vec3 b = fetch(pos, vec2(-1.0, off)).rgb;
	vec3 c = fetch(pos, vec2( 0.0, off)).rgb;
	vec3 d = fetch(pos, vec2(+1.0, off)).rgb;
	vec3 e = fetch(pos, vec2(+2.0, off)).rgb;
	float dst = dist(pos).x;
	// Convert distance to weight.
	float scale = kHardPix;
	float wa = gaus(dst - 2.0, scale);
	float wb = gaus(dst - 1.0, scale);
	float wc = gaus(dst + 0.0, scale);
	float wd = gaus(dst + 1.0, scale);
	float we = gaus(dst + 2.0, scale);
	// Return filtered sample.
	return (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
}

// Return scanline weight.
float scan(vec2 pos, float off) {
	float dst = dist(pos).y;
	return gaus(dst + off, sHardScan);
}

// Allow nearest three lines to effect pixel.
vec3 tri(vec2 pos)
{
	vec3 a = horz3(pos, -1.0);
	vec3 b = horz5(pos,  0.0);
	vec3 c = horz3(pos, +1.0);
	float wa = scan(pos, -1.0);
	float wb = scan(pos,  0.0);
	float wc = scan(pos, +1.0);
	return a * wa + b * wb + c * wc;
}

// Distortion of scanlines, and end of screen alpha.
vec2 warp(vec2 pos)
{
	pos = pos * 2.0 - 1.0;
	pos *= vec2(
		1.0 + (pos.y * pos.y) * kWarp.x,
		1.0 + (pos.x * pos.x) * kWarp.y
	);
	return pos * 0.5 + 0.5;
}

// Shadow mask.
vec3 mask(vec2 pos)
{
	pos.x += pos.y * 3.0;
	vec3 mask = vec3(kMaskDark, kMaskDark, kMaskDark);
	pos.x = fract(pos.x / 6.0);
	if (pos.x < 0.333)
		mask.r = kMaskLight;
	else if (pos.x < 0.666)
		mask.g = kMaskLight;
	else
		mask.b = kMaskLight;
	return mask;
}

// Draw dividing bars.
float bar(float pos, float bar) {
	pos -= bar;
	return (pos * pos < 4.0) ? 0.0 : 1.0;
}

float rand(vec2 co) {
	return fract(sin(dot(co.xy , vec2(12.9898, 78.233))) * 43758.5453);
}

// Entry.
void main()
{
//    vec2 pos = warp(gl_FragCoord.xy / resolution.xy);
//    vec2 pos = gl_FragCoord.xy / resolution.xy;
    vec2 pos = o_texcoord;// resolution.xy;
    
	  // Unmodified.
     vec3 c = tri(pos) * mask(gl_FragCoord.xy);
     out_color = vec4(
        toSrgb(vec3(c)),
        1.0
     );
    //out_color = texture(map,o_texcoord);
   //out_color = vec4(1.0,0.0,0.0,1.0);
}
`;

export default class Screen {
constructor(con,texture) {

  const w = con.CONSOLE_WIDTH / window.innerWidth;
  const h = con.CONSOLE_HEIGHT / window.innerHeight;

  this.console = con;
  const gl = this.console.gl;
  const gl2 = this.console.gl2;

  const program = this.program = gl2.createProgram(crtVShader,crtFShader);
  
  this.positionLocation = gl.getAttribLocation(program,'position');
  this.texcoordLocation = gl.getAttribLocation(program,'texcoord');

  // VAOのセットアップ
  this.vao = gl.createVertexArray();
  gl.bindVertexArray(this.vao);

  // Text用ジオメトリのセットアップ //
  // インターリーブ形式
  
  this.bufferData = new Float32Array([
    -w, h,0,0,
    w, h,1,0,
    -w, -h,0,1,
    w, -h,1,1
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

  this.mapLocation = gl.getUniformLocation(program,'map');
  this.resolutionLocation = gl.getUniformLocation(program,'resolution');
  this.timeLocation = gl.getUniformLocation(program,'time');
  this.texture = texture;
  this.resolution = [this.console.CONSOLE_WIDTH, this.console.CONSOLE_HEIGHT];

  this.console.on('resize', this.resize.bind(this));
}

render() {
  const gl = this.console.gl;
  gl.enable(gl.DEPTH_TEST);
  //gl.enable(gl.CULL_FACE);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(this.program);
  gl.bindVertexArray(this.vao);
//  twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D,this.texture);
  gl.uniform1i(this.mapLocation,0);

  gl.uniform1f(this.timeLocation,0);
  gl.uniform2fv(this.resolutionLocation,this.resolution);

  //twgl.setUniforms(this.programInfo, this.uniforms);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

resize() {
  const con = this.console;
  const w = con.CONSOLE_WIDTH / window.innerWidth;
  const h = con.CONSOLE_HEIGHT / window.innerHeight;
  const gl = this.console.gl;

  this.bufferData = new Float32Array([
    -w, h,0,0,
    w, h,1,0,
    -w, -h,0,1,
    w, -h,1,1
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.bufferData);
  gl.bindBuffer(gl.ARRAY_BUFFER,null);

  this.resolution[0] = this.console.CONSOLE_WIDTH;
  this.resolution[1] = this.console.CONSOLE_HEIGHT;

}

}

