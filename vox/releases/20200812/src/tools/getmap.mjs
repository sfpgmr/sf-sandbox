"use strict"
import request from  'request-promise-native';
import fs  from 'fs';
import lz  from './lzbase62.min.js';
import d3 from 'd3';

import THREE from 'three';
import parseGeoraster from "georaster";
import {exec as exec_} from 'child_process';
import {promisify} from 'util';

const exec = promisify(exec_);

  // const boundary = {
  //   e: 135.5361,
  //   n: 34.7076,
  //   s: 34.6452,
  //   w: 135.4601
  // };  
  //34.69434, 135.1943
  //35.6815, 139.7557
  //35.1712, 136.885
  //43.0687, 141.3511

  const mapCenter = {lat: 43.0687,lon:141.3511};
  const latWidth = 0.07;
  const lonWidth = 0.07;

  const boundary = {
    e: mapCenter.lon + lonWidth / 2,
    n: mapCenter.lat + latWidth / 2,
    s: mapCenter.lat - latWidth / 2,
    w: mapCenter.lon - lonWidth / 2
  };  

  // const boundary = {
  //   e: 139.7552 + 0.036,
  //   n: 35.6837 + 0.035,
  //   s: 35.6837 - 0.035,
  //   w: 139.7552 - 0.036
  // };  
  //   const boundary = {
//   e: 135.5090,
//   n: 34.7093,
//   s: 34.6840,
//   w: 135.4769
// };//tileToBoundary(targetTile.x, targetTile.y, targetTile.z);

// バウンダリの分割
const div = 4;
const boundaries = [];
const lonw = Math.abs(boundary.e - boundary.w) / div;
const latw = Math.abs(boundary.n - boundary.s) / div;

const project = createProjection(centroid(boundary));

for (let lon = 0; lon < div; ++lon) {
  for (let lat = 0; lat < div; ++lat) {
    boundaries.push(
      {
        e: Math.round(((lon + 1) * lonw + boundary.w) * 10000) / 10000,
        w: Math.round((lon * lonw + boundary.w) * 10000) / 10000,
        s: Math.round((lat * latw + boundary.s) * 10000) / 10000,
        n: Math.round(((lat + 1) * latw + boundary.s) * 10000) / 10000
      });
  }
}
const apiServers = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

function midpoint(_arg, _arg1) {
  let x1 = _arg[0], y1 = _arg[1],
    x2 = _arg1[0], y2 = _arg1[1],
    x = x1 - (x1 - x2) / 2,
    y = y1 - (y1 - y2) / 2;
  return [x, y];
};

function centroid(boundary) {
  let p1 = [boundary.w, boundary.n],
    p2 = [boundary.e, boundary.s];
  return midpoint(p1, p2);
};

function createProjection(center) {
  return d3.geoMercator().scale(6.5 * 1000 * 1000).center(center).translate([0, 0]);
};


function isArea(way) {
  return way.nodes[0] == way.nodes[way.nodes.length - 1];
};

async function loadOverpassData(boundary, serverIndex = 1,cachidx) {
 
    let url = `${apiServers[serverIndex]}/interpreter?data=[out:json];\n(\n  node(${boundary.s},${boundary.w},${boundary.n},${boundary.e});\n  way(bn);\n);\n(\n  ._;\n  node(w);\n);\nout;`;
    const cachePath = `./temp/cache_${cachidx.toString(10).padStart(5,'0')}.json`;
    let rawData;
    try {
      const temp  = await fs.promises.readFile(cachePath,'utf8');
      rawData = JSON.parse(temp);
    } catch (e) {
      rawData = await request.get(url,{json:true});
      await fs.promises.writeFile(cachePath,JSON.stringify(rawData,null,1),'utf8');
    }
   

//    const rawData = await request.get(url,{json:true});
    
    const acc = {
      node: new Map(),
      way: {
        polygons: [],
        lines: []
      },
      relation: []
    };
    rawData.elements.forEach(function (elem) {
      switch (elem.type) {
        case 'node':
          acc.node.set(elem.id, elem);
          break;
        case 'way':
          isArea(elem) ? acc.way.polygons.push(elem) : acc.way.lines.push(elem);
          break;
        case 'relation':
          acc.relation.push(elem);
          break;
      }
      //acc[elem.type][elem.id] = elem;
    });
    return acc;
}

(async ()=>{

  let divi = 1;
  //let heightData = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N034E135_DSM.tif")));
  //let heightData = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N035E136_DSM.tif")));
  let heightData = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N042E141_DSM.tif")));
  let heightData2 = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N043E141_DSM.tif")));
  //let heightData2 = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N035E135_DSM.tif")));
  //let heightData = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N035E139_DSM.tif")));
  //let heightData = (await parseGeoraster(await fs.promises.readFile("temp/ALPSMLC30_N033E130_DSM.tif")));
if(process.argv[2] == 'clear'){
    await exec('rm ./temp/cache_*.json');
  }
  
  
  for (let i = 0, e = boundaries.length / divi; i < e; ++i) {
    for (let j = 0; j < divi; ++j) {
      let retry = 5;
      let data;
      while(true){
        try {
          data = await loadOverpassData(boundaries[i * divi + j], j,i * divi + j);
          break;
        } catch (e) {
          --retry;
          if(!retry) throw (`data load error:${e.message}`);
        }
      }

      data.way.polygons.forEach((d) => {
        // let lonmax = heightData.xmin,lonmin = heightData.xmax,latmax =  heightData.ymin,latmin = heightData.ymax;
        let height = 0;

        d.nodes.forEach((n, idx) => {
          const t = data.node.get(n);
          let h;
          //console.log(t.lat,t.lon);
          if(t.lat <= 42){
            h = heightData.values[0][(3600 - (t.lat - heightData.ymin) * 3600 ) | 0][((t.lon - heightData.xmin) * 3600 )| 0];
          } else {
            h = heightData2.values[0][(3600 - (t.lat - heightData2.ymin) * 3600 ) | 0][((t.lon - heightData2.xmin) * 3600 )| 0];
          }
          (h > height) && (height = h);
          // (t.lon > lonmax) && (lonmax = t.lon);
          // (t.lon < lonmin) && (lonmin = t.lon);
          // (t.lat > latmax) && (latmax = t.lat);
          // (t.lat < latmin) && (latmin = t.lat);
          d.nodes[idx] = project([t.lon, t.lat]);
          delete d.nodes[idx].id;
          delete d.nodes[idx].type;
        });

        // const lonmid = (lonmax + lonmin) / 2;
        // const latmid = (latmax + latmin) / 2;
        // const posx = ((lonmid - heightData.xmin) * 3600) | 0;
        // const posy = (3600 - (latmid - heightData.ymin) * 3600) | 0;
        // height = heightData.values[0][posy][posx];
        if(d.tags && d.tags['building']){
          if(d.tags['building:levels']){
            let l = parseInt(d.tags['building:levels']) | 0;
            if(l < (height / 2.5)) {
              d.tags['building:levels'] = (height / 2.5) | 0;
            }
          } else {
            d.tags['building:levels'] = (height / 2.5) | 0;
          }
  //        d.tags['amount'] = height;

///          if(!d.tags['building:levels']){
//            d.tags['building:levels'] = (height / 2.5) | 0;
//            d.tags['amount'] = height;
//          }
        }
      });

      data.way.lines.forEach((d) => {
        d.nodes.forEach((n, idx) => {
          const t = data.node.get(n);
          d.nodes[idx] = project([t.lon, t.lat]);
          delete d.nodes[idx].id;
          delete d.nodes[idx].type;
        });
      });

      delete data.node;
      let compressedData = { data: lz.compress(JSON.stringify(data)) };
      await fs.promises.writeFile(`./map${('00000' + (i * divi + j)).slice(-5)}.json`, JSON.stringify(compressedData));
     // await fs.promises.writeFile(`./temp/map${('00000' + (i * divi + j)).slice(-5)}.json`, JSON.stringify(data, null, 2));
      console.log(i * divi + j);
    }
  }
})();

