
// this is a slow convex hull calculation that you can count on to work
// it's careful of the epsilon cases, and wether or not
//   to include collinear points along the hull edge

import { mat4, mat2, mat3, vec3, vec2, vec4 } from '../js/gl-matrix/gl-matrix.js';
import { FindRectInPolygon } from './findRectInPolygon.mjs';

const findRectInPolygon = new FindRectInPolygon();
const EPSILON_LOW = 0.003;
const EPSILON = 0.00001;
const EPSILON_HIGH = 0.00000001;

function epsilonEqual(a, b, epsilon) {
  if (epsilon === undefined) { epsilon = EPSILON_HIGH; }
  return (Math.abs(a - b) < epsilon);
}

function arrayContainsObject(array, object) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === object) {
      return true;
    }
  }
  return false;
}


function getPolygonCentroid(pts) {
  let first = pts[0], last = pts[pts.length - 1];
  if (first[0] != last[0] || first[1] != last[1]) pts.push(first);
  let twicearea = 0,
    x = 0, y = 0,
    nPts = pts.length,
    p1, p2, f;
  for (var i = 0, j = nPts - 1; i < nPts; j = i++) {
    p1 = pts[i]; p2 = pts[j];
    f = (p1[1] - first[1]) * (p2[0] - first[0]) - (p2[1] - first[1]) * (p1[0] - first[0]);
    twicearea += f;
    x += (p1[0] + p2[0] - 2 * first[0]) * f;
    y += (p1[1] + p2[1] - 2 * first[1]) * f;
  }
  f = twicearea * 3;
  return vec2.fromValues(x / f + first[0], y / f + first[1]);
}

// points should be an array of objects {x:___, y:___} where ___ values should be numbers
export function convexHull(points) {
  // validate input
  if (points === undefined || points.length === 0) { return []; }
  points = points.map(d => vec2.fromValues(d[0], d[1]));
  // # points in the convex hull before escaping function
  const INFINITE_LOOP = 10000;
  // sort points by x and y
  const sorted = points.sort(function (a, b) {
    if (a[0] - b[0] < -EPSILON_HIGH) { return -1; }
    if (a[0] - b[0] > EPSILON_HIGH) { return 1; }
    if (a[1] - b[1] < -EPSILON_HIGH) { return -1; }
    if (a[1] - b[1] > EPSILON_HIGH) { return 1; }
    return 0;
  });
  const hull = [];
  hull.push(sorted[0]);
  // the current direction the perimeter walker is facing
  var ang = 0;
  var infiniteLoop = 0;
  do {
    infiniteLoop++;
    var h = hull.length - 1;
    var angles = sorted
      // remove all points in the same location from this search
      .filter(function (el) {
        return !(epsilonEqual(el[0], hull[h][0], EPSILON_HIGH) && epsilonEqual(el[1], hull[h][1], EPSILON_HIGH))
      })
      // sort by angle, setting lowest values next to "ang"
      .map(function (el) {
        var angle = Math.atan2(hull[h][1] - el[1], hull[h][0] - el[0]);
        while (angle < ang) { angle += Math.PI * 2; }
        return { node: el, angle: angle };
      })
      .sort(function (a, b) { return (a.angle < b.angle) ? -1 : (a.angle > b.angle) ? 1 : 0 });
    if (angles.length === 0) { return []; }
    // narrowest-most right turn
    var rightTurn = angles[0];
    // collect all other points that are collinear along the same ray
    angles = angles.filter(function (el) { return epsilonEqual(rightTurn.angle, el.angle, EPSILON_LOW); })
      // sort collinear points by their distances from the connecting point
      .map(function (el) {
        var distance = Math.sqrt(Math.pow(hull[h][0] - el.node[0], 2) + Math.pow(hull[h][1] - el.node[1], 2));
        el.distance = distance;
        return el;
      })
      // (OPTION 1) exclude all collinear points along the hull 
      .sort(function (a, b) { return (a.distance < b.distance) ? 1 : (a.distance > b.distance) ? -1 : 0 });
    // (OPTION 2) include all collinear points along the hull
    // .sort(function(a,b){return (a.distance < b.distance)?-1:(a.distance > b.distance)?1:0});
    // if the point is already in the convex hull, we've made a loop. we're done
    if (arrayContainsObject(hull, angles[0].node)) { return hull; }
    // add point to hull, prepare to loop again
    hull.push(angles[0].node);
    // update walking direction with the angle to the new point
    ang = Math.atan2(hull[h][1] - angles[0].node[1], hull[h][0] - angles[0].node[0]);
  } while (infiniteLoop < INFINITE_LOOP);
  return [];
}

export function minimumBoundingRectangle(points) {
  /** Find the smallest bounding rectangle for a set of points.
  Returns a set of points representing the corners of the bounding box.
  */

  const pi2 = Math.PI / 2;

  // get the convex hull for the points
  // 凸包
  let hull_points = convexHull(points);
  // 矩形の重心を求める
  let center = getPolygonCentroid(points);
  hull_points = hull_points.map(p => vec2.fromValues(p[0] - center[0], p[1] - center[1]));

  // calculate edge angles
  //const edges = [];
  let angles = [];
  for (let i = 1, e = hull_points.length; i < e; ++i) {
    angles.push(
      Math.abs(
        Math.atan2(
          hull_points[i][1] - hull_points[i - 1][1],
          hull_points[i][0] - hull_points[i - 1][0]
        ) % pi2
      )
    );
  }


  angles = angles.filter((d, i, a) => {
    return a.indexOf(d) == i;
  });

  const rotations = angles.map(angle => { return { mat: mat2.fromRotation(mat2.create(), angle), angle: angle }; });


  //    angles = np.zeros((len(edges)))
  //    angles = np.arctan2(edges[:, 1], edges[:, 0])

  //   angles = np.abs(np.mod(angles, pi2))
  //   angles = np.unique(angles)

  // find rotation matrices
  // XXX both work
  // rotations = np.vstack([
  //     np.cos(angles),
  //     np.cos(angles-pi2),
  //     np.cos(angles+pi2),
  //     np.cos(angles)]).T

  //rotations = rotations.reshape((-1, 2, 2))

  //# apply rotations to the hull

  let mbr = null;
  rotations.forEach((m, i) => {
//    findRectInPolygon.vertices = hull_points.map(v => vec2.transformMat2(vec2.create(), v, m.mat));
//    const r = findRectInPolygon.computeLargestRectangle();
    let result = { xmin: r.xmin, xmax: r.xmax, ymin: r.ymin, ymax: r.ymax, angle: m.angle, mat: m.mat };
    hull_points.map(v => vec2.transformMat2(vec2.create(), v, m.mat)).forEach(v => {
      if ((result.xmin == null) || (v[0] < result.xmin)) result.xmin = v[0];
      if ((result.xmax == null) || (v[0] > result.xmax)) result.xmax = v[0];
      if ((result.ymin == null) || (v[1] < result.ymin)) result.ymin = v[1];
      if ((result.ymax == null) || (v[1] > result.ymax)) result.ymax = v[1];
    });
    result.area = (result.xmax - result.xmin) * (result.ymax - result.ymin);
    if ((mbr == null) || (mbr.area > result.area) ) {
      mbr = result;
    }
  });

  if (mbr) {
    const inv = mat2.invert(mat2.create(), mbr.mat);
    const x1 = mbr.xmax, x2 = mbr.xmin, y1 = mbr.ymax, y2 = mbr.ymin;
    let rval = [
      vec2.fromValues(x1, y2),
      vec2.fromValues(x2, y2),
      vec2.fromValues(x2, y1),
      vec2.fromValues(x1, y1),
      vec2.fromValues(x1, y2)
    ];
    rval = rval.map(v => vec2.add(v, vec2.transformMat2(v, v, inv), center));
    return { coords: rval, angle: mbr.angle };

  } else {
    return { coords: points };
  }
}

    //rot_points = np.dot(rotations, hull_points.T)

    //# find the bounding points
    // min_x = np.nanmin(rot_points[:, 0], axis=1)
    // max_x = np.nanmax(rot_points[:, 0], axis=1)
    // min_y = np.nanmin(rot_points[:, 1], axis=1)
    // max_y = np.nanmax(rot_points[:, 1], axis=1)

    //# find the box with the best area
    // areas = (max_x - min_x) * (max_y - min_y)
    // best_idx = np.argmin(areas)

    //# return the best box
    // x1 = max_x[best_idx]
    // x2 = min_x[best_idx]
    // y1 = max_y[best_idx]
    // y2 = min_y[best_idx]
    // r = rotations[best_idx]

    // rval = np.zeros((4, 2))
    // rval[0] = np.dot([x1, y2], r)
    // rval[1] = np.dot([x2, y2], r)
    // rval[2] = np.dot([x2, y1], r)
    // rval[3] = np.dot([x1, y1], r)

    // return rval