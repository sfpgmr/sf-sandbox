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
  const scrollMapData = JSON.parse(await fsp.readFile('../temp/map.json', 'utf8'));
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
          let lonMin,lonMax,latMin,latMax;
          lonMin = lonMax = data.features[0].geometry.coordinates[0][0]; 
          latMin = latMax = data.features[0].geometry.coordinates[0][1]; 

          for(const feature of data.features){
            const coords = feature.geometry.coordinates;
            for(const coord of coords){
              (lonMin > coord[0]) && (lonMin = coord[0]);
              (lonMax < coord[0]) && (lonMax = coord[0]);
              (latMin > coord[1]) && (latMin = coord[1]);
              (latMax < coord[1]) && (latMax = coord[1]);
            }
          }
          data.attributes = {
            xmin:lonMin,
            xmax:lonMax,
            ymin:latMin,
            ymax:latMax,
            width:lonMax-lonMin,
            height:latMax-latMin
          };
          maps.set(`${x}_${y}`, data);
        }
      }
    }
  }
  const mapsArray = Array.from(maps.values());
  let a = mapsArray.reduce((p,curr)=>{
    p.width += curr.attributes.width;
    p.height += curr.attributes.height;
    return p;
  },{width:0,height:0});
  a.width = a.width / mapsArray.length;
  a.height = a.height / mapsArray.length;
  console.log(a);
  //let merged = geojsonMerge.merge(Array.from(maps.values()));
  await fsp.writeFile(`../temp/merged.json`, JSON.stringify(mapsArray, null, 1), 'utf8');
})();
