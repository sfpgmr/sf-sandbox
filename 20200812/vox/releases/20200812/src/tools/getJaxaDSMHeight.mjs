import parseGeoraster from "georaster";
import fs from 'fs';

const dataMap = new Map();
const wx = 768 / 2;
const wy = 768 / 2;

async function loadFile(lat,lon){
  let key  = `N${lat.toString(10).padStart(3,'0')}E${lon.toString(10).padStart(3,'0')}`;
  let d = await fs.promises.readFile(`../temp/basedata/ALPSMLC30_${key}_DSM.tif`);
  let dm = await fs.promises.readFile(`../temp/basedata/ALPSMLC30_${key}_MSK.tif`);
  let data = await parseGeoraster(d);
  let datamask = await parseGeoraster(dm);
  let obj = {height:data.values[0],mask:datamask.values[0]};
  dataMap.set(key, obj);
  return obj;
}

// 緯度・傾度から高さデータ(JAXA DSM)を得る
// 日本のみ
// https://www.eorc.jaxa.jp/ALOS/aw3d30/index_j.htm
export default async function getJaxaDSMHeight(lat,lon){
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

