
import { vec2 } from '../js/gl-matrix/gl-matrix.js';

function min(a, b) { return (a < b) ? a : b; }
function max(a, b) { return (a > b) ? a : b; }

export class GeomEdge {

  constructor(p, q) {
    this.xmin = min(p[0], q[0]);
    this.xmax = max(p[0], q[0]);
    this.ymin = min(p[1], q[1]);
    this.ymax = max(p[1], q[1]);
    this.m = (q[1] - p[1]) / (q[0] - p[0]);
    this.b = p[1] - this.m * (p[0]);
    this.isTop = p[0] > q[0]; //edge from right to left (ccw)
    this.isRight = p[1] > q[1]; //edge from bottom to top (ccw)
  }
}


export class FindRectInPolygon {

  // let status;
  // private let start, stop; //tangents for iterative convex hull
  // private let xmin,xmax,ymin,ymax;  //position of hull
  // let yxmax; //y coord of xmax
  // GeomPoint rectp;
  // let recth, rectw;
  // const changed;

  // /* largest rectangles with corners on AC, BD, ABC, ABD, ACD, BCD */
  // let RectList;  

  // /* fixed aspect ratio */
  // private const fixed;
  // private let fixedX, fixedY;

  constructor() {
    this.fixed = false;
    this.fixedX = 1;
    this.fixedY = 1;
    this.RectList = [];
    this.vertices = [];
    this.start = 0;
    this.stop = 0;
    this.xmin = 0;
    this.xmax = 0;
    this.ymin = 0;
    this.ymax = 0;
  }

  /* position of point w.r.t. hull edge
   * sign of twice the area of triangle abc
   */
  onLeft(a, b, c) {
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    return area < 0;
  }

  /* check if point is outside
   * true is point is on right of all vertices
   * finds tangents if point is outside
   */
  pointOutside(p) {//, let start, let stop){
    let ptIn = true, currIn, prevIn = true;
    const vertices = this.vertices;
    let a = vertices[0];
    let b;

    for (let i = 0, len = vertices.length; i < len; ++i) {

      b = vertices[(i + 1) % len];
      currIn = this.onLeft(a, b, p);
      ptIn = ptIn && currIn;
      a = b;

      if (prevIn && !currIn) { this.start = i; } /* next point outside, 1st tangent found */
      if (!prevIn && currIn) { this.stop = i; }  /* 2nd tangent */
      prevIn = currIn;
    }
    return !ptIn;
  }

  /* check if point is outside, insert it, maintaining general position */
  addPointToHull(p) {

    /* index of tangents */
    this.start = 0;
    this.stop = 0;
    const verts = this.vertices;

    if (this.pointOutside(p)) {
      return false;
    }

    /* insert point */
    let numRemove;

    if (this.stop > this.start) {
      numRemove = this.stop - this.start - 1;
      verts.splice(this.start + 1, numRemove, ...p); //insertElmentAt(p, start+1);
    }
    else {
      numRemove = this.stop + verts.length - this.start - 1;
      if (numRemove > 0) {
        if (this.start + 1 < verts.length) {
          verts.splice(this.start + 1, verts.length - (this.start + 1));
        }
        if ((this.stop - 1) >= 0) {
          verts.splice(0, this.stop - 1);
        }
      }
      verts.push(p);

    }
    this.changed = true;
    return true;
  } //addPointToHull

  /* compute edge list
   * set xmin, xmax
   * used to find largest rectangle by scanning horizontally
   */
  computeEdgeList() {
    const l = [];
    let a = vec2.create(), b = vec2.create();
    let e;
    const verts = this.vertices;
    a = verts[verts.length - 1];
    for (let i = 0, len = verts.length; i < len; ++i) {
      b = verts[i];

      if (i == 0) {
        this.xmin = a[0];
        this.xmax = a[0];
        this.ymin = a[1];
        this.ymax = a[1];
      }
      else {
        if (a[0] < this.xmin) {
          this.xmin = a[0];
        }
        if (a[0] > this.xmax) {
          this.xmax = a[0];
          this.yxmax = a[1];
        }
        if (a[1] < this.ymin) {
          this.ymin = a[1];
        }
        if (a[1] > this.ymax) {
          this.ymax = a[1];
        }
      }
      e = new GeomEdge(a, b);
      l.push(e);
      a = b;
    }
    return l;
  }

  /* compute y intersection with an edge
   * first pixel completely inside
   * ceil function if edge is on top, floor otherwise
   * (+y is down)
   */
  yIntersect(xi, e) {
    const yfirst = (e.m) * (xi - 0.5) + e.b;
    const ylast = (e.m) * (xi + 0.5) + e.b;
    return (!e.isTop) ? Math.floor(Math.min(yfirst, ylast)) : Math.ceil(Math.max(yfirst, ylast));
  }

  /* find largest pixel completely inside
   * look through all edges for intersection
   */
  xIntersect(y, l = []) {
    let x = 0;
    let x0 = 0, x1 = 0;
    const verts = this.vertices;
    for (let i = 0, len = verts.length; i < len; ++i) {
      const e = l[i];
      if (e.isRight && e.ymin <= y && e.ymax >= y) {
        x0 = (y + 0.5 - e.b) / e.m;
        x1 = (y - 0.5 - e.b) / e.m;
      }
    }
    x = Math.floor(Math.min(x0, x1));
    //System.out.println("xIntersect, x is " + x);
    return x;
  }

  findEdge(x, isTop, l) {
    let e, emax = l[0];
    //let count = 0;
    for (let i = 0, len = l.length; i < len; ++i) {
      e = l[i];
      if (e.xmin == x) {
        //count++;
        //if (count == 1){
        //    emax = e;
        //}
        //else{
        if (e.xmax != e.xmin) {
          if ((e.isTop && isTop) || (!e.isTop && !isTop)) {
            emax = e;
          }
        }
      }

    }
    return emax;
  }

  /* compute 3 top and bottom 3 corner rectangle for each xi
   * find largest 2 corner rectangle
   */
  computeLargestRectangle() {

    this.changed = false;
    let edgeList = this.computeEdgeList();
    this.RectList = [];

    let top, bottom;
    let ymax, ymin, xright, xlo, xhi;
    let area, maxArea = 0;
    let maxAreaAC = 0, maxAreaBD = 0, maxAreaABC = 0, maxAreaABD = 0, maxAreaACD = 0, maxAreaBCD = 0;
    let width, height, maxh = 0, maxw = 0;

    /* all 2-corner and 3-corner largest rectangles */
    let aAC = 0, aBD = 0, aABC = 0, aABD = 0, aACD = 0, aBCD = 0;
    let pAC, pBD, pABC, pABD, pACD, pBCD;
    let hAC = 0, wAC = 0, hBD = 0, wBD = 0, hABC = 0, wABC = 0, hABD = 0, wABD = 0, hACD = 0, wACD = 0, hBCD = 0, wBCD = 0;
    let onA, onB, onC, onD;

    let maxp = vec2.create();
    pAC = maxp; pBD = maxp; pABC = maxp; pABD = maxp; pACD = maxp; pBCD = maxp;

    let xint = [];

    for (let i = 0; i < this.ymax; ++i) {
      const x = this.xIntersect(i, edgeList);
      const px = vec2.fromValues(x, i);
      xint.push(px);
    }
    //find first top and bottom edges
    top = this.findEdge(this.xmin, true, edgeList);
    bottom = this.findEdge(this.xmin, false, edgeList);

    //scan for rectangle left position
    for (let xi = this.xmin; xi < this.xmax; xi++) {

      ymin = this.yIntersect(xi, top);
      ymax = this.yIntersect(xi, bottom);

      for (let ylo = ymax; ylo >= ymin; --ylo) {//ylo from to to bottom

        for (let yhi = ymin; yhi <= ymax; ++yhi) {

          if (yhi > ylo) {

            onA = (yhi == ymax && !bottom.isRight);
            onD = (ylo == ymin && !top.isRight);

            xlo = (xint[ylo])[0];//xIntersect(ylo,edgeList);
            xhi = (xint[yhi])[0];//xIntersect(yhi,edgeList);

            xright = min(xlo, xhi);
            onC = (xright == xlo && this.yxmax >= ylo);
            onB = (xright == xhi && this.yxmax <= yhi);

            height = yhi - ylo;
            width = xright - xi;

            if (!this.fixed) {
            }//!fixed
            else {
              let fixedWidth = Math.ceil((height * this.fixedX) / (this.fixedY));
              if (fixedWidth <= width) {
                width = fixedWidth;
              }
              else {
                width = 0;
              }
            }
            area = width * height;
            //AC 
            if (onA && onC && !onB && !onD) {
              if (area > aAC) {
                aAC = area;
                pAC = vec2.fromValues(xi, ylo);
                hAC = height;
                wAC = width;
              }
            }
            //BD
            if (onB && onD && !onA && !onC) {
              if (area > aBD) {
                aBD = area;
                pBD = vec2.fromValues(xi, ylo);
                hBD = height;
                wBD = width;
              }
            }
            //ABC
            if (onA && onB && onC) {
              if (area > aABC) {
                aABC = area;
                pABC = vec2.fromValues(xi, ylo);
                hABC = height;
                wABC = width;
              }
            }
            //ABD
            if (onA && onB && onD) {
              if (area > aABD) {
                aABD = area;
                pABD = vec2.fromValues(xi, ylo);
                hABD = height;
                wABD = width;
              }
            }
            //ACD
            if (onA && onC && onD) {
              if (area > aACD) {
                aACD = area;
                pACD = vec2.fromValues(xi, ylo);
                hACD = height;
                wACD = width;
              }
            }
            //BCD
            if (onB && onC && onD) {
              if (area > aBCD) {
                aBCD = area;
                pBCD = vec2.fromValues(xi, ylo);
                hBCD = height;
                wBCD = width;
              }
            }

            if (area > maxArea) {
              maxArea = area;
              maxp = vec2.fromValues(xi, ylo);
              maxw = width;
              maxh = height;
              // System.out.println(onA + " " + onB + " " + onC + " " + onD);
            }
          }//yhi > ylo
        }//for yhi
      }//for ylo
      if (xi == top.xmax) {
        top = this.findEdge(xi, true, edgeList);
      }
      if (xi == bottom.xmax) {
        bottom = this.findEdge(xi, false, edgeList);
      }
    }//xi

    // this.rectp = maxp;
    // this.recth = maxh;
    // this.rectw = maxw;

    // this.RectList.push(vec4.fromValues(pAC[0], pAC[1], wAC, hAC));
    // this.RectList.push(vec4.fromValues(pBD[0], pBD[1], wBD, hBD));
    // this.RectList.push(vec4.fromValues(pABC[0], pABC[1], wABC, hABC));
    // this.RectList.push(vec4.fromValues(pABD[0], pABD[1], wABD, hABD));
    // this.RectList.push(vec4.fromValues(pACD[0], pACD[1], wACD, hACD));
    // this.RectList.push(vec4.fromValues(pBCD[0], pBCD[1], wBCD, hBCD));
    // this.RectList.push(vec4.fromValues(maxp[0], maxp[1], maxw, maxh));


    return {
      xmax:maxp[0] + maxw,
      xmin:maxp[0],
      ymin:maxp[1],
      ymax:maxp[1] + maxh
    }
    //   vec2.fromValues(maxp[0], maxp[1]),
    //   vec2.fromValues(maxp[0], maxp[1] + maxh),
    //   vec2.fromValues(maxp[0] + maxw, maxp[1] + maxh),
    //   vec2.fromValues(maxp[0] + maxw, maxp[1]),
    //   vec2.fromValues(maxp[0], maxp[1])
    // ];
  }

}


