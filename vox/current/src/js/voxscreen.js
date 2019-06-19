'use strict';

import { Node } from './scene.js';
import { mat4, vec3, vec4 } from './gl-matrix/gl-matrix.js';

const vs =
  `#version 300 es
precision mediump float;
uniform mat4 u_worldViewProjection;
uniform vec3 u_lightWorldPos;
uniform mat4 u_world;
uniform mat4 u_viewInverse;
//uniform mat4 u_worldInverseTranspose;

in vec3 position;
//in vec3 normal;
in vec2 texcoord;

out vec4 v_position;
out vec2 v_texCoord;
//flat out vec3 v_normal;
out vec3 v_surfaceToLight;
out vec3 v_surfaceToView;

void main() {
  v_texCoord = texcoord;
  vec4 pos = vec4(position,1.0);
  v_position = u_worldViewProjection * pos;
  v_surfaceToLight = u_lightWorldPos - (u_world * pos).xyz;
  v_surfaceToView = (u_viewInverse[3] - (u_world * pos)).xyz;
  gl_Position = v_position;
}
`;

const fs =
  `#version 300 es
precision mediump float;

in vec4 v_position;
in vec2 v_texCoord;
//flat in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;

//uniform vec4 u_color;
uniform vec4 u_lightColor;
uniform vec4 u_ambient;
uniform vec4 u_diffuse;
uniform vec4 u_specular;
uniform float u_shininess;
uniform float u_specularFactor;

out vec4 out_color;

vec4 lit(float l ,float h, float m) {
  return vec4(1.0,
              max(l, 0.0),
              (l > 0.0) ? pow(max(0.0, h), m) : 0.0,
              1.0);
}

void main() {
  vec4 diffuseColor = u_diffuse;//texture(u_diffuse, v_texCoord);
  vec3 dx = dFdx(v_position.xyz);
  vec3 dy = dFdy(v_position.xyz);
  vec3 a_normal = normalize(cross(normalize(dx), normalize(dy)));
  //vec3 a_normal = normalize(v_normal);
  vec3 surfaceToLight = normalize(v_surfaceToLight);
  vec3 surfaceToView = normalize(v_surfaceToView);
  vec3 halfVector = normalize(surfaceToLight + surfaceToView);
  vec4 litR = lit(dot(a_normal, surfaceToLight),
                    dot(a_normal, halfVector), u_shininess);
  vec4 outColor = vec4((
  u_lightColor * (diffuseColor * litR.y + diffuseColor * u_ambient +
                u_specular * litR.z * u_specularFactor) /* * u_color*/).rgb,
      diffuseColor.a);
  out_color = outColor;
}
`;

export async function loadVoxFiles(path){
  const buffer = (await fetch(path)).arrayBuffer;
}

export class Program {
  constructor(gl2, vs, fs) {
    this.program = gl2.createProgram(vs, fs);
  }
}

export class Model {
  constructor(con, data, program) {
    const gl = this.gl = con.gl;
    this.program = program || con.vscreen.program;

    this.drawInfos = data.drawInfos;
    const bufferData = new Float32Array(data.data);

    // VAOのセットアップ
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);

    gl.useProgram(this.program);

    this.positionLocation = gl.getAttribLocation(this.program, 'position');
    this.texcoordLocation = gl.getAttribLocation(this.program, 'texcoord');

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, data.position_size, gl.FLOAT, true, data.stride, 0);

    gl.enableVertexAttribArray(this.texcoordLocation);
    gl.vertexAttribPointer(this.texcoordLocation, data.texcoord_size, gl.FLOAT, true, data.stride, data.position_size * bufferData.BYTES_PER_ELEMENT);

    this.ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

    gl.bindVertexArray(null);

    // Uniform 

    this.worldViewProjectionLoc = gl.getUniformLocation(this.program, 'u_worldViewProjection');
    this.lightWorldPosLoc = gl.getUniformLocation(this.program, 'u_lightWorldPos');
    this.worldLoc = gl.getUniformLocation(this.program, 'u_world');
    this.viewInverseLoc = gl.getUniformLocation(this.program, 'u_viewInverse');
    //this.worldInvTransLoc = gl.getUniformLocation(this.program, 'u_worldInverseTranspose');

    this.lightColorLoc = gl.getUniformLocation(this.program, 'u_lightColor');
    this.ambientLoc = gl.getUniformLocation(this.program, 'u_ambient');
    this.diffuseLoc = gl.getUniformLocation(this.program, 'u_diffuse');
    this.specularLoc = gl.getUniformLocation(this.program, 'u_specular');
    this.shininessLoc = gl.getUniformLocation(this.program, 'u_shininess');
    this.specularFactorLoc = gl.getUniformLocation(this.program, 'u_specularFactor');

  }

  render(screen, uniforms) {
    const gl = this.gl;
    const sUniforms = screen.uniforms;

    gl.useProgram(this.program);

    gl.uniformMatrix4fv(this.worldViewProjectionLoc,false, uniforms.u_worldViewProjection);
    gl.uniform3fv(this.lightWorldPosLoc, sUniforms.u_lightWorldPos);
    gl.uniformMatrix4fv(this.worldLoc,false, uniforms.u_world);
    gl.uniformMatrix4fv(this.viewInverseLoc, false,sUniforms.u_viewInverse);
    //gl.uniformMatrix4fv(this.worldInvTransLoc, false,uniforms.u_worldInverseTranspose);

    gl.uniform4fv(this.lightColorLoc, sUniforms.u_lightColor);
    gl.uniform4fv(this.ambientLoc, sUniforms.u_ambient);

    gl.bindVertexArray(this.vao);

    this.drawInfos.forEach(d => {
      gl.uniform4fv(this.diffuseLoc, d.material.u_diffuse);
      gl.uniform4fv(this.specularLoc, d.material.u_specular);
      gl.uniform1f(this.shininessLoc, d.material.u_shininess);
      gl.uniform1f(this.specularFactorLoc, d.material.u_specularFactor);

      gl.drawElements(gl.TRIANGLES, d.count, gl.UNSIGNED_SHORT, d.offset);

    });

  }
}

export class SceneNode extends Node {
  constructor(model, visible = true) {
    super();
    this.model = model;
    this.visible = visible;
    this.uniforms = {};
  }

  render(screen) {
    if (!this.visible) return;

    const u_worldInverseTranspose = mat4.create();
    mat4.invert(u_worldInverseTranspose, this.worldMatrix);
    mat4.transpose(u_worldInverseTranspose, u_worldInverseTranspose);

    this.uniforms = {
      u_world: this.worldMatrix,
      u_worldViewProjection: mat4.multiply(mat4.create(), screen.uniforms.viewProjection, this.worldMatrix)
    };

    this.model.render(screen, this.uniforms);

  }

}

export default class VScreen {
  constructor(con) {
    this.console = con;
    this.gl = con.gl;
    const gl2 = this.gl2 = con.gl2;
    this.y = 0;

    this.scene = new Node();
    this.program = gl2.createProgram(vs, fs);
    this.sceneNodes = [];

    this.uniforms = {
      u_lightWorldPos: vec3.fromValues(1, 108, 1000),
      u_lightColor: vec4.fromValues(1.0, 1.0, 1.0, 1),
      u_ambient: vec4.fromValues(0.2, 0.2, 0.2, 1.0)
    };

    const fov = this.console.ANGLE_OF_VIEW * Math.PI / 180;
    //const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const aspect = con.VIRTUAL_WIDTH / con.VIRTUAL_HEIGHT;
    const zNear = 0.01;
    const zFar = 100000;
    const projection = mat4.perspective(mat4.create(), fov, aspect, zNear, zFar);
    const eye = vec3.fromValues(0, 0, this.console.CAMERA_Z);
    const target = vec3.create();
    const up = vec3.fromValues(0, 1, 0);

    const view = mat4.lookAt(mat4.create(), eye, target, up);
    const camera = mat4.invert(mat4.create(), view);
    this.uniforms.viewProjection = mat4.multiply(mat4.create(), projection, view);

    this.uniforms.u_viewInverse = camera;

  }

  appendScene(sceneNode, parent = this.scene) {
    if (!(sceneNode instanceof Node)) throw new TypeError('');
    sceneNode.setParent(parent);
    this.sceneNodes.push(sceneNode);
  }

  removeScene(sceneNode) {
    {
      const ndx = sceneNode.parent.children.indexOf(sceneNode);
      if (ndx >= 0) {
        sceneNode.parent.children.splice(ndx, 1);
      }
    }
    {
      const ndx = this.sceneNodes.indexOf(sceneNode);
      if (ndx >= 0) {
        this.sceneNodes.splice(ndx, 1);
      }
    }
  }

  render() {

    this.y += 0.006;

    this.scene.updateWorldMatrix();

    this.sceneNodes.forEach(n => {
      if (n.visible) {
        n.render(this);
      }
    });
  }

}


