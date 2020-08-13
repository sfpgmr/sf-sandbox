import request from 'request-promise-native';
import fs from 'fs';
import { tile2latlon, latlon2tile } from '../js/tileLatLon.mjs';
import getJaxaDSMHeight from './getJaxaDSMHeight.mjs';
import {convexHull,minimumBoundingRectangle} from './mbr.mjs';

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
  const fids = new Map();

  // データとして除外するタイプ
  const excludeTypes = [
    '一般等高線',
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
    '標高点（測点）',
    '水準点',
    //    '特殊軌道',
    '町村・指定都市の区',
    //    'その他',
    '郡市・東京都の区',
    '電子基準点',
    'トンネル内の道路',
    '三角点'
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
      ymin = p1.rt.y - 1;
      ymax = p2.rb.y + 1;
    }
    for (let x = xmin; x <= xmax; ++x) {
      for (let y = ymin; y <= ymax; ++y) {
        if (!maps.has(`${x}_${y}`)) {
          let data = await (async () => {
            try {
              return JSON.parse(await fsp.readFile(`../temp/cache/fgd/fgd${x}_${y}.json`, 'utf8'));
            } catch (e) {
              const data = await request({ url: `https://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/18/${x}/${y}.geojson`, json: true });
              await fsp.writeFile(`../temp/cache/fgd/fgd${x}_${y}.json`, JSON.stringify(data, null, 1), 'utf8');
              return data;
            }
          })();
          data.features = data.features.filter(f => {
            return excludeTypes.indexOf(f.properties.type, 0) == -1;
          });
          let lonMin, lonMax, latMin, latMax;
          lonMin = lonMax = data.features[0].geometry.coordinates[0][0];
          latMin = latMax = data.features[0].geometry.coordinates[0][1];

          for (let i = 0,e = data.features.length;i < e;++i) {
            const feature = data.features[i];
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
            if(feature.properties.class.match(/Bld/)){
              if (!fids.has(feature.properties.fid)) {
                fids.set(feature.properties.fid, [{
                  featureCollection:data,
                  feature:feature
                }]);
              } else {
                fids.get(feature.properties.fid).push({
                  featureCollection:data,
                  index:i,
                  feature:feature
                });
              }
            }
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

  //

  // {
    for(const fid of fids){
      if(fid[1].length > 1){
        const features = fid[1];
        // 結合順にソートする
        features.sort((a,b)=>{
          const atop = a.feature.geometry.coordinates[0],
            abottom = a.feature.geometry.coordinates[a.feature.geometry.coordinates.length - 1],
            btop = b.feature.geometry.coordinates[0],
            bbottom = b.feature.geometry.coordinates[b.feature.geometry.coordinates.length - 1];
            // top     +--------+ 
            //         +   a    +
            // bottom  +--------+ +--------+ top
            //                    +   b    +
            //                    +--------+ bottom
            if((abottom[0] == btop[0]) && (abottom[1] == btop[1])){
              return -1;
            }
            // top     +--------+ 
            //         +   b    +
            // bottom  +--------+ +--------+ top
            //                    +   a    +
            //                    +--------+ bottom
            if((bbottom[0] == atop[0]) && (bbottom[1] == atop[1])){
              return 1;
            }
            // top     +--------+ 
            //         +   a    + +--------+ top
            // bottom  +--------+ +   b    + 
            //                    +--------+ bottom
            if(atop[1] > btop[1]){
              return 1;
            }
            //                    +--------+ top
            // top     +--------+ +   b    + 
            //         +   a    + +--------+ bottom
            // bottom  +--------+ 
            if(atop[1] < btop[1]){
              return -1;
            }

            if(atop[0] < btop[0]){
              return 1;
            }
            if(atop[0] > btop[0]){
              return -1;
            }
            return 0;
        });

        // 結合する
        const merged = features[0];
        for(let i = 1,e = features.length;i < e;++i){
          const target = features[i];
          // 配列の最初の頂点は重複しているので削除する
          target.feature.geometry.coordinates.shift();
          merged.feature.geometry.coordinates.push(...target.feature.geometry.coordinates
            );
          target.featureCollection.features.splice(target.featureCollection.features.findIndex(f=>f.properties.fid == target.feature.properties.fid),1);
        }
        //const ch = convexHull(merged.feature.geometry.coordinates);
        const rect = minimumBoundingRectangle(merged.feature.geometry.coordinates);
        merged.feature.geometry.coordinates = rect.coords;
      } else {
        const feature = fid[1][0].feature;
        const rect = minimumBoundingRectangle(feature.geometry.coordinates);
        feature.geometry.coordinates = rect.coords;
      }
    }

  //  // await fsp.writeFile("../temp/dup_fids.json", JSON.stringify(a, null, 1), 'utf8');
  // }
  // //  maps.forEach((v,k,m)

  // // 事物の高さ情報の取得
  // const heightCache = new Map();
  // for (const featureCollection of maps.values()) {
  //   for (const feature of featureCollection.features) {
  //     for (const coord of feature.geometry.coordinates) {
  //       const lat = coord[1], lon = coord[0];
  //       coord.push((await getJaxaDSMHeight(lat, lon)).height);
  //       const p = latlon2tile(lat, lon, 18);
  //       const x = p.x | 0, y = p.y | 0;
  //       const tileName = `dem10b${x}_${y}`;
  //       //console.log(lat,lon,p,tileName);
  //       let data;
  //       if (!heightCache.has(tileName)) {
  //         data = await (async () => {
  //           try {
  //             return JSON.parse(await fsp.readFile(`../temp/cache/dem/${tileName}.json`, 'utf8'));
  //           } catch (e) {
  //             const data = await request({ url: `https://cyberjapandata.gsi.go.jp/xyz/experimental_dem10b/18/${x}/${y}.geojson`, json: true });
  //             await fsp.writeFile(`../temp/cache/dem/${tileName}.json`, JSON.stringify(data, null, 1), 'utf8');
  //             return data;
  //           }
  //         })();
  //         //console.log(tileName,data.features.length,Math.sqrt(data.features.length));
  //         heightCache.set(tileName, data);
  //       } else {
  //         data = heightCache.get(tileName);
  //       }
  //       const dataLon = [];

  //       data.features.sort((a, b) => {
  //         if (a.geometry.coordinates[1] < b.geometry.coordinates[1]) return -1;
  //         if (a.geometry.coordinates[1] > b.geometry.coordinates[1]) return 1;
  //         if (a.geometry.coordinates[1] == b.geometry.coordinates[1]) {
  //           if (a.geometry.coordinates[0] < b.geometry.coordinates[0]) return -1;
  //           if (a.geometry.coordinates[0] > b.geometry.coordinates[0]) return 1;
  //           return 0;
  //         }
  //       });

  //       data.features.reduce((prev, curr, index) => {
  //         if ((prev.geometry.coordinates[0] <= lon) && (lon <= curr.geometry.coordinates[0])) {
  //           dataLon.push([prev, curr]);
  //         } else if ((index == (data.features.length - 1)) && (lon > curr.geometry.coordinates[0])) {
  //           dataLon.push([curr, curr]);
  //         } else if ((index == 1) && lon < prev.geometry.coordinates[0]) {
  //           dataLon.push([prev, prev]);
  //         }
  //         // else {
  //         //   console.log("■data■",index,lat,lon,prev.geometry.coordinates,curr.geometry.coordinates);
  //         // }
  //         return curr;
  //       });

  //       dataLon.sort((a, b) => {
  //         if (a[0].geometry.coordinates[1] < b[0].geometry.coordinates[1]) return -1;
  //         if (a[0].geometry.coordinates[1] > b[0].geometry.coordinates[1]) return 1;
  //         if (a[0].geometry.coordinates[1] == b[0].geometry.coordinates[1]) return 0;
  //       });

  //       const dataLat = [];
  //       if (dataLon.length > 1) {
  //         dataLon.reduce((prev, curr, index) => {
  //           //console.log(prev,curr);
  //           if ((prev[0].geometry.coordinates[1] <= lat) && (lat <= curr[0].geometry.coordinates[1])) {
  //             dataLat.push([prev, curr]);
  //           } else if ((index == (dataLon.length - 1)) && (lat > curr[0].geometry.coordinates[1])) {
  //             dataLat.push([prev]);
  //           } else if ((index == 1) && lat < prev[0].geometry.coordinates[1]) {
  //             dataLat.push([prev]);
  //           }  //else {
  //           //        console.log("■data■",index,lat,lon,prev[0].geometry.coordinates,curr[0].geometry.coordinates);
  //           //  }

  //           return curr;
  //         });

  //         //console.log(dataLat);
  //         // if(!dataLat.length){
  //         //   console.log(lat,lon,JSON.stringify(dataLon,null,1));
  //         // }
  //         //console.log(dataLat);
  //         coord.push(dataLat[0][0][0].properties.alti);
  //       } else {
  //         // console.log(dataLon[0]);
  //         coord.push(dataLon[0][0].properties.alti);
  //       }
  //     }
  //   }
  // }

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
