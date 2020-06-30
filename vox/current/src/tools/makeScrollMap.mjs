import request from 'request-promise-native';
import fs from 'fs';
import { tile2latlon, latlon2tile } from '../js/tileLatLon.mjs';
import geojsonMerge from '@mapbox/geojson-merge';

const fsp = fs.promises;

(async () => {
  try {
    await fsp.mkdir('../temp/cache');
  } catch (e) {

  }
  //const scrollMapData = JSON.parse(await fsp.readFile('../temp/tokyo.json', 'utf8'));
  const scrollMapData = JSON.parse(await fsp.readFile('../temp/osaka.json', 'utf8'));
  const mappos = scrollMapData.features[0].geometry.coordinates
    .map(d => {
      let p = latlon2tile(d[1], d[0], 18);
      let lt = { x: (p.x - 0.5) | 0, y: (p.y - 0.5) | 0 };
      let rt = { x: (p.x + 0.5) | 0, y: (p.y - 0.5) | 0 };
      let lb = { x: (p.x - 0.5) | 0, y: (p.y + 0.5) | 0 };
      let rb = { x: (p.x + 0.5) | 0, y: (p.y + 0.5) | 0 };

      return { lt: lt, rt: rt, lb: lb, rb: rb };
    });
  // .filter((x,i,self)=>{
  //   return self.findIndex(e=>(e.x == x.x) && (e.y == x.y)) == i;
  // });

  //let xmin = mappos[0].x, xmax = mappos[0].x,ymin = mappos[0].y,ymax = mappos[0].y;
  // mappos.forEach(d=>{
  //   (d.x < xmin) && (xmin = d.x); 
  //   (d.x > xmax) && (xmax = d.x); 
  //   (d.y < ymin) && (ymin = d.y); 
  //   (d.y > ymax) && (ymax = d.y); 
  // });

  // --xmin;
  // ++xmax;
  // --ymin;
  // ++ymax;

  const maps = new Map();
  const classMap = new Map();
  const typeMap = new Map();

  const extrudeTypes = [
//   '一般等高線',
//   '真幅道路',
//    '庭園路等',
//    '普通建物',
//    '堅ろう建物',
//    '普通無壁舎',
//    '水涯線（河川）',
//    '歩道',
//    '普通鉄道',
//    '分離帯',
    'トンネル内の鉄道',
    '大字・町・丁目界',
    '町村・指定都市の区界',
    '市区町村界',
//    '堅ろう無壁舎',
    '大字・町・丁目',
//    '標高点（測点）',
//    '水準点',
//    '特殊軌道',
    '町村・指定都市の区',
//    'その他',
    '郡市・東京都の区',
//    '電子基準点',
    'トンネル内の道路',
//    '三角点'
  ];

  for (let i = 0, e = mappos.length - 1; i < e; i += 1) {
    const p1 = mappos[i];
    const p2 = mappos[i + 1];
    let xmin, xmax, ymin, ymax;
    if (p1.lt.x > p2.lt.x) {
      xmin = p2.lt.x - 1;
      xmax = p1.rt.x + 1;
    } else {
      xmin = p1.lt.x - 1;
      xmax = p2.rt.x + 1;
    }
    if (p1.rt.y > p2.rt.y) {
      ymin = p2.rt.y - 1;
      ymax = p1.rb.y + 1;
    } else {
      ymin = p1.rt.y - 1;
      ymax = p2.rb.y + 1;
    }
    for (let x = xmin; x <= xmax; ++x) {
      for (let y = ymin; y <= ymax; ++y) {
        if (!maps.has(`${x}_${y}`)) {
          let data = await (async () => {
            try {
              return JSON.parse(await fsp.readFile(`../temp/cache/fgd${x}_${y}.json`, 'utf8'));
            } catch (e) {
              const data = await request({ url: `https://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/18/${x}/${y}.geojson`, json: true });
              await fsp.writeFile(`../temp/cache/fgd${x}_${y}.json`, JSON.stringify(data, null, 1), 'utf8');
              return data;
            }
          })();
          data.features = data.features.filter(f=>{
            return extrudeTypes.indexOf(f.properties.type,0) == -1;
          });
          let lonMin, lonMax, latMin, latMax;
          lonMin = lonMax = data.features[0].geometry.coordinates[0][0];
          latMin = latMax = data.features[0].geometry.coordinates[0][1];

          for (const feature of data.features) {
            const coords = feature.geometry.coordinates;
            if (feature.geometry.type == 'LineString') {
              for (const coord of coords) {
                (lonMin > coord[0]) && (lonMin = coord[0]);
                (lonMax < coord[0]) && (lonMax = coord[0]);
                (latMin > coord[1]) && (latMin = coord[1]);
                (latMax < coord[1]) && (latMax = coord[1]);
              }
            } else if (feature.geometry.type == 'Point') {
              (lonMin > coords[0]) && (lonMin = coords[0]);
              (lonMax < coords[0]) && (lonMax = coords[0]);
              (latMin > coords[1]) && (latMin = coords[1]);
              (latMax < coords[1]) && (latMax = coords[1]);
            }
            classMap.set(feature.properties.class, true);
            typeMap.set(feature.properties.type, true);
          }
          data.attributes = {
            xmin: lonMin,
            xmax: lonMax,
            ymin: latMin,
            ymax: latMax,
            width: lonMax - lonMin,
            height: latMax - latMin
          };
          maps.set(`${x}_${y}`, data);
        }
      }
    }
  }
  const mapsArray = Array.from(maps.values());
  let a = mapsArray.reduce((p, curr) => {
    p.width += curr.attributes.width;
    p.height += curr.attributes.height;
    return p;
  }, { width: 0, height: 0 });
  a.avgWidth = a.width / mapsArray.length;
  a.avgHeight = a.height / mapsArray.length;
  console.log(a, mapsArray.length);
  console.log(Array.from(classMap.keys()));
  console.log(Array.from(typeMap.keys()));
  //let merged = geojsonMerge.merge(Array.from(maps.values()));
  await fsp.writeFile(`../temp/merged.json`, JSON.stringify({ maps: mapsArray, attributes: a }, null, 1), 'utf8');
  await fsp.writeFile(`../temp/scrollMap.json`, JSON.stringify(scrollMapData, null, 1), 'utf8');
})();
