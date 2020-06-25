import parseGeoraster from "georaster";
import fs from 'fs';
import lz from './lzbase62.min.js';


const dataMap = new Map();
const wx = 768 / 2;
const wy = 768 / 2;

async function loadFile(lat,lon){
  let key  = `N${lat.toString(10).padStart(3,'0')}E${lon.toString(10).padStart(3,'0')}`;
  let d = await fs.promises.readFile(`../../basedata/ALPSMLC30_${key}_DSM.tif`);
  let dm = await fs.promises.readFile(`../../basedata/ALPSMLC30_${key}_MSK.tif`);
  let data = await parseGeoraster(d);
  let datamask = await parseGeoraster(dm);
  let obj = {height:data.values[0],mask:datamask.values[0]};
  dataMap.set(key, obj);
  return obj;
}

async function getData(lat,lon){
  const lati = lat | 0;
  const loni = lon | 0;
  let mapData;
  let key  = `N${lati.toString(10).padStart(3,'0')}E${loni.toString(10).padStart(3,'0')}`;
  if(!dataMap.has(key)){
    mapData = await loadFile(lati,loni);
  } else {
    mapData = dataMap.get(key);
  }
  const x = ((1 - (lat-lati)) * 3600) | 0;
  const y =  (((lon - loni)) * 3600) | 0;
  return {height:mapData.height[x][y],mask:mapData.mask[x][y]};
}

(async () => {
  const param = process.argv[2].split(',').map(p=>parseFloat(p));
  const lat =  param[0];
  const lon =  param[1];
  const sx = lon - (wx / 3600),ex = lon + (wx / 3600),
        sy = lat - (wy / 3600),ey = lat + (wy / 3600) 
  let values = [];
  let attribs = [];

  for (let y = sy,i = 0,ei = wy * 2; i < ei ; y+= 1/3600,++i) {
    for (let x = sx,j = 0,ej = wx * 2; j < ej; x+= 1/3600,++j) {
      const d = await getData(y,x);
      const m = d.mask;
      const h = d.height;
      values.push(h);
      attribs.push(m);
    }
  }

  //let compressedData = { data: lz.compress(JSON.stringify(vertex))};
  const outdata = { values: values,attributes:attribs,wx:wx * 2,wy:wy * 2};
  await fs.promises.writeFile(`./map.json`, JSON.stringify(outdata));
  // console.log(a);
})();
