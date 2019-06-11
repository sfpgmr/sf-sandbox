'use strict';

//import * as twgl from '../../twgl/twgl-full.js';
import  { mat4, vec3} from './gl-matrix/gl-matrix.js';
//const m4 = twgl.m4;

export class TRS {
  constructor() {
    this.translation = vec3.create();
    this.rotation = vec3.create();
    this.scale = vec3.fromValues(1, 1, 1);
  }

  getMatrix(dst) {
    dst = dst || mat4.create();
    const t = this.translation;
    const r = this.rotation;
    const s = this.scale;

    // compute a matrix from translation, rotation, and scale
    mat4.fromTranslation(dst,t);
    mat4.scale(dst, dst,s);
    mat4.rotateX(dst,dst, r[0]);
    mat4.rotateY(dst,dst, r[1]);
    mat4.rotateZ(dst,dst, r[2]);

    return dst;
  }
}

export class Node {
  constructor(source = new TRS()) {
    this.children = [];
    this.localMatrix = mat4.identity(mat4.create());
    this.worldMatrix = mat4.identity(mat4.create());
    this.source = source;
  }

  setParent(parent) {
    // remove us from our parent
    if (this.parent) {
      const ndx = this.parent.children.indexOf(this);
      if (ndx >= 0) {
        this.parent.children.splice(ndx, 1);
      }
    }

    // Add us to our new parent
    if (parent) {
      parent.children.push(this);
    }
    this.parent = parent;
  }

  updateWorldMatrix(matrix) {
    const source = this.source;
    if (source) {
      source.getMatrix(this.localMatrix);
    }

    if (matrix) {
      // a matrix was passed in so do the math
      mat4.multiply(this.worldMatrix,matrix, this.localMatrix );
    } else {
      // no matrix was passed in so just copy.
      mat4.copy(this.worldMatrix,this.localMatrix);
    }

    // now process all the children
    const worldMatrix = this.worldMatrix;
    this.children.forEach(function (child) {
      child.updateWorldMatrix(worldMatrix);
    });
  }
}


