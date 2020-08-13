import gdal
import requests
import numpy as np
import math
import os
import json
from shapely import geometry as g

jaxa_dsm_cache = {}

def get_tile_num(lon,lat,zoom):
  # https:#wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Python
  lat_rad = math.radians(lat)
  n = 2.0 ** zoom
  xtile = (lon + 180.0) / 360.0 * n
  ytile = (1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n
  return xtile, ytile

def get_jaxa_dsm_height (x,y) :
  global jaxa_dsm_cache
  xi = int(x)
  yi = int(y)
  
  key = f'N{yi:03}E{xi:03}'
  map_data = None 
  if(key in jaxa_dsm_cache) :
    map_data = jaxa_dsm_cache[key]
  else :
    dsm_path = f'../../temp/basedata/ALPSMLC30_{key}_DSM.tif'
    mask_path = f'../../temp/basedata/ALPSMLC30_{key}_MSK.tif'
    dsm = gdal.Open(dsm_path,gdal.GA_ReadOnly)
    dsm_band = dsm.GetRasterBand(1).ReadAsArray()
    msk = gdal.Open(mask_path,gdal.GA_ReadOnly)
    msk_band = msk.GetRasterBand(1).ReadAsArray()
    map_data = jaxa_dsm_cache[key] = (dsm_band,msk_band)
  x1 = int(((x-xi)) * 3600)
  y1 = int((1 - (y - yi)) * 3600)
  return map_data[0][y1][x1],map_data[1][y1][x1]


def get_jaxa_dsm_height_rect (rect) :
  global jaxa_dsm_cache

  x1,y1,x2,y2 = rect.bounds
  x1i = int(x1)
  y1i = int(y1)
  x2i = int(x2)
  y2i = int(y2)

  key = f'N{y1i:03}E{x1i:03}'
  map_data = None 
  if(key in jaxa_dsm_cache) :
    map_data = jaxa_dsm_cache[key]
  else :
    dsm_path = f'../../temp/basedata/ALPSMLC30_{key}_DSM.tif'
    mask_path = f'../../temp/basedata/ALPSMLC30_{key}_MSK.tif'
    dsm = gdal.Open(dsm_path,gdal.GA_ReadOnly)
    dsm_band = dsm.GetRasterBand(1).ReadAsArray()
    msk = gdal.Open(mask_path,gdal.GA_ReadOnly)
    msk_band = msk.GetRasterBand(1).ReadAsArray()
    map_data = jaxa_dsm_cache[key] = (dsm_band,msk_band)
  
  xs = int(((x1-x1i)) * 3600)
  ye = int(math.ceil((1 - (y1 - y1i)) * 3600))
  xe = int(math.ceil(((x2-x2i)) * 3600))
  ys = int((1 - (y2 - y2i)) * 3600)

  
  if(xs > xe) : 
    xs = xe

  if(ys > ye) :
    ys = ye

  h = None

  for x in range(xs,xe,1) :
    for y in range(ys,ye,1) :
        hc = map_data[0][y][x]  
        h = max(h,hc) if h != None else hc
  return h if h != None else map_data[0][ys][xs]

dem_cache = {}

if __name__ == "__main__":
  #print(get_dem_height(135.182647705078,34.688277852776))
  print(get_jaxa_dsm_height(136.882829583,
                35.1760475))

