import parseGeoraster from "georaster";
import fs from 'fs';
//import lz  from './lzbase62.min.js';
import png from 'pngjs';

const hsl2rgb = function(h, s, l) {
	const RGB_MAX = 255;
	const HUE_MAX = 360;
	const SATURATION_MAX = 100;
	const LIGHTNESS_MAX = 100;
	let r, g, b, max, min;
	
	h = h % HUE_MAX;
	s = s / SATURATION_MAX;
	l = l / LIGHTNESS_MAX;
	
	if (l < 0.5) {
		max = l + l * s;
		min = l - l * s;
	} else {
		max = l + (1 - l) * s;
		min = l - (1 - l) * s;
	}
	
	const hp = HUE_MAX / 6;
	const q = h / hp;
	if (q <= 1) {
		r = max;
		g = (h / hp) * (max - min) + min;
		b = min;
	} else if (q <= 2) {
		r = ((hp * 2 - h) / hp) * (max - min) + min;
		g = max;
		b = min;
	} else if (q <= 3) {
		r = min;
		g = max;
		b = ((h - hp * 2) / hp) * (max - min) + min;
	} else if (q <= 4) {
		r = min;
		g = ((hp * 4 - h) / hp) * (max - min) + min;
		b = max;
	} else if (q <= 5) {
		r = ((h - hp * 4) / hp) * (max - min) + min;
		g = min;
		b = max;
	} else {
		r = max;
		g = min;
		b = ((HUE_MAX - h) / hp) * (max - min) + min;
	}

	return {
		r: r * RGB_MAX,
		g: g * RGB_MAX,
		b: b * RGB_MAX
	};
};

(async()=>{
  let img = new png.PNG({width:3600,height:3600});
  
  let d = await fs.promises.readFile("../../basedata/ALPSMLC30_N034E135_DSM.tif");
  let dm = await fs.promises.readFile("../../basedata/ALPSMLC30_N034E135_MSK.tif");
  let data = await parseGeoraster(d);
  let datamask = await parseGeoraster(dm);
  let height = data.values[0];
  let mask = datamask.values[0];
  let max = 0;

  for(let x = 0;x < 3600;++x){
    for(let y = 0; y < 3600;++y){
      let c = height[y][x];
      (c > max) && (max = c);
    }
  }
  
  for(let x = 0;x < 3600;++x){
    for(let y = 0; y < 3600;++y){
      let c = ((height[y][x] / max) * 360 + 90);
      (c > 360) && (c -= 360); 
      let color = hsl2rgb(c,50,50);
      let m = mask[y][x];
			//console.log(m);
				if((m & 0xfc) == 4) {
					img.data[y * (3600 * 4)  + x * 4 ]  = 255;
					img.data[y * (3600 * 4)  + x * 4  + 1]  = 255;
					img.data[y * (3600 * 4)  + x * 4  + 2]  = 255;
					img.data[y * (3600 * 4)  + x * 4  + 3]  = 255;
				} else  {
       if((m & 0x2) != 0){
        img.data[y * (3600 * 4)  + x * 4 ]  = 0;
        img.data[y * (3600 * 4)  + x * 4  + 1]  = 0;
        img.data[y * (3600 * 4)  + x * 4  + 2]  = 192;
        img.data[y * (3600 * 4)  + x * 4  + 3]  = 255;
      } else {
        img.data[y * (3600 * 4)  + x * 4 ]  = color.r;
        img.data[y * (3600 * 4)  + x * 4  + 1]  = color.g;
        img.data[y * (3600 * 4)  + x * 4  + 2]  = color.b;
        img.data[y * (3600 * 4)  + x * 4  + 3]  = 255;
			}
		}
    }
  }

  img.pack().pipe(fs.createWriteStream("./out.png"))
  // let compressedData = { data: lz.compress(JSON.stringify(data)) };
  // await fs.promises.writeFile(`./map.json`, JSON.stringify(compressedData,null,1));
  // console.log(a);
})();
