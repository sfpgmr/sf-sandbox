import request from 'request-promise-native';
import fs from 'fs';
import {tile2latlon,latlon2tile} from '../js/tileLatLon.mjs';
import geojsonMerge from '@mapbox/geojson-merge';

const fsp = fs.promises;

(async()=>{
  try {
    await fsp.mkdir('../temp/cache');
  } catch (e) {

  }
  const scrollMapData = JSON.parse(await fsp.readFile('../temp/map.json','utf8'));
  const mappos = scrollMapData.features[0].geometry.coordinates
    .map(d=>{ 
      let p = latlon2tile(d[1],d[0],18);
      return {x:p.x |  0,y:p.y | 0};
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
  
  const maps = [];
  const promsies = [];
  
  for(let i = 0,e = mappos.length - 1;i < e;i+=1){
    const p1 = mappos[i];
    const p2 = mappos[i+1];
    let xmin,xmax,ymin,ymax;
    if(p1.x > p2.x){
      xmin  = p2.x;
      xmax  = p1.x;
    } else {
      xmin  = p1.x;
      xmax  = p2.x;
    }
    if(p1.y > p2.y){
      ymin  = p2.y;
      ymax  = p1.y;
    } else {
      ymin  = p1.y;
      ymax  = p2.y;
    }
    for(let x = xmin;x <= xmax;++x){
      for(let y = ymin;y <= ymax;++y){
        let data = await (async ()=>{
          try {
            return JSON.parse(await fsp.readFile(`../temp/cache/fgd${x}_${y}.json`,'utf8'));
          } catch (e) {
            const data = await request({url:`https://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/18/${x}/${y}.geojson`,json:true});
            await fsp.writeFile(`../temp/cache/fgd${x}_${y}.json`,JSON.stringify(data,null,1),'utf8');
            return data;
          }
        })();
        maps.push(data);
      }
    }
  }
  
 let merged = geojsonMerge.merge(maps);
  await fsp.writeFile(`../temp/merged.json`,JSON.stringify(merged,null,1),'utf8');
})();
