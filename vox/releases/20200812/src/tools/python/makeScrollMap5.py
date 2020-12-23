import gdal
import json
import CGAL
from shapely import geometry,affinity,algorithms
from shapely.geometry import Polygon
import shapely
import numpy as np
import os
import math
import requests
import re
import cvxpy
from itertools import islice
import time
from get_height import get_jaxa_dsm_height,get_tile_num,get_jaxa_dsm_height_rect
start = time.time()
import pandas as pd

#import latlon2tile as l2t
#from maxrect import get_intersection,get_maximal_rectangle,rect2poly


def minimum_rotated_rectangle(rect):
    # first compute the convex hull
    hull = rect.convex_hull
    try:
        coords = hull.exterior.coords
    except AttributeError:  # may be a Point or a LineString
        return hull
    # generate the edge vectors between the convex hull's coords
    edges = ((pt2[0] - pt1[0], pt2[1] - pt1[1]) for pt1, pt2 in zip(
        coords, islice(coords, 1, None)))

    def _transformed_rects():
        for dx, dy in edges:
            # compute the normalized direction vector of the edge
            # vector.

            rad = math.atan2(dy,dx)
            transf_rect = affinity.rotate(rect,rad,'center',use_radians=True)
            yield (transf_rect, -rad)

    # check for the minimum area rectangle and return it
    transf_rect, inv_rad = min(
        _transformed_rects(), key=lambda r: r[0].area)
    return affinity.rotate(transf_rect, inv_rad,'center',use_radians=True)


def rect2poly(ll, ur):
    """
    Convert rectangle defined by lower left/upper right
    to a closed polygon representation.
    """
    x0, y0 = ll
    x1, y1 = ur

    return [
        [x0, y0],
        [x0, y1],
        [x1, y1],
        [x1, y0],
        [x0, y0]
    ]


def get_intersection(coords):
    """Given an input list of coordinates, find the intersection
    section of corner coordinates. Returns geojson of the
    interesection polygon.
    """
    ipoly = None
    for coord in coords:
        if ipoly is None:
            ipoly = Polygon(coord)
        else:
            tmp = Polygon(coord)
            ipoly = ipoly.intersection(tmp)

    # close the polygon loop by adding the first coordinate again
    first_x = ipoly.exterior.coords.xy[0][0]
    first_y = ipoly.exterior.coords.xy[1][0]
    ipoly.exterior.coords.xy[0].append(first_x)
    ipoly.exterior.coords.xy[1].append(first_y)

    inter_coords = zip(
        ipoly.exterior.coords.xy[0], ipoly.exterior.coords.xy[1])

    inter_gj = {"geometry":
                {"coordinates": [inter_coords],
                 "type": "Polygon"},
                "properties": {}, "type": "Feature"}

    return inter_gj, inter_coords


def two_pts_to_line(pt1, pt2):
    """
    Create a line from two points in form of

    a1(x) + a2(y) = b
    """
    pt1 = [float(p) for p in pt1]
    pt2 = [float(p) for p in pt2]
    try:
        slp = (pt2[1] - pt1[1]) / (pt2[0] - pt1[0])
    except ZeroDivisionError:
        slp = 1e5 * (pt2[1] - pt1[1])
    a1 = -slp
    a2 = 1.
    b = -slp * pt1[0] + pt1[1]

    return a1, a2, b


def pts_to_leq(coords):
    """
    Converts a set of points to form Ax = b, but since
    x is of length 2 this is like A1(x1) + A2(x2) = B.
    returns A1, A2, B
    """

    A1 = []
    A2 = []
    B = []
    for i in range(len(coords) - 1):
        pt1 = coords[i]
        pt2 = coords[i + 1]
        a1, a2, b = two_pts_to_line(pt1, pt2)
        A1.append(a1)
        A2.append(a2)
        B.append(b)
    return A1, A2, B


def get_maximal_rectangle(coordinates):
    """
    Find the largest, inscribed, axis-aligned rectangle.

    :param coordinates:
        A list of of [x, y] pairs describing a closed, convex polygon.
    """

    coordinates = np.array(coordinates)
    x_range = np.max(coordinates, axis=0)[0]-np.min(coordinates, axis=0)[0]
    y_range = np.max(coordinates, axis=0)[1]-np.min(coordinates, axis=0)[1]

    scale = np.array([x_range, y_range])
    sc_coordinates = coordinates/scale

    poly = Polygon(sc_coordinates)
    inside_pt = (poly.representative_point().x,
                 poly.representative_point().y)

    A1, A2, B = pts_to_leq(sc_coordinates)

    bl = cvxpy.Variable(2)
    tr = cvxpy.Variable(2)
    br = cvxpy.Variable(2)
    tl = cvxpy.Variable(2)
    obj = cvxpy.Maximize(cvxpy.log(tr[0] - bl[0]) + cvxpy.log(tr[1] - bl[1]))
    constraints = [bl[0] == tl[0],
                   br[0] == tr[0],
                   tl[1] == tr[1],
                   bl[1] == br[1],
                   ]

    for i in range(len(B)):
        if inside_pt[0] * A1[i] + inside_pt[1] * A2[i] <= B[i]:
            constraints.append(bl[0] * A1[i] + bl[1] * A2[i] <= B[i])
            constraints.append(tr[0] * A1[i] + tr[1] * A2[i] <= B[i])
            constraints.append(br[0] * A1[i] + br[1] * A2[i] <= B[i])
            constraints.append(tl[0] * A1[i] + tl[1] * A2[i] <= B[i])

        else:
            constraints.append(bl[0] * A1[i] + bl[1] * A2[i] >= B[i])
            constraints.append(tr[0] * A1[i] + tr[1] * A2[i] >= B[i])
            constraints.append(br[0] * A1[i] + br[1] * A2[i] >= B[i])
            constraints.append(tl[0] * A1[i] + tl[1] * A2[i] >= B[i])

    prob = cvxpy.Problem(obj, constraints)
    prob.solve(verbose=False, max_iters=1000, reltol=1e-9)
    bottom_left = np.array(bl.value).T * scale
    top_right = np.array(tr.value).T * scale

    return ((bottom_left[0],top_right[1]),tuple(bottom_left), (top_right[0],bottom_left[1]),tuple(top_right),(bottom_left[0],top_right[1]))

# データとして除外するタイプ
exclude_types = np.array([
  '一般等高線',
  #   '真幅道路',
  #    '庭園路等',
  #    '普通建物',
  #    '堅ろう建物',
  #    '普通無壁舎',
  #    '水涯線（河川）',
  #    '歩道',
 #     '普通鉄道',
  #    '分離帯',
  'トンネル内の鉄道',
  '大字・町・丁目界',
  '町村・指定都市の区界',
  '市区町村界',
  #    '堅ろう無壁舎',
  '大字・町・丁目',
  '標高点（測点）',
  '水準点',
  #    '特殊軌道',
  '町村・指定都市の区',
      'その他',
  '郡市・東京都の区',
  '電子基準点',
  'トンネル内の道路',
  '三角点'
])

rad_range = np.arange(0., math.pi, math.pi / 32.)

dem_cache = {}

def get_dem(x,y) :
  global dem_cache
  tile_name = f'dem10b{x}_{y}'
  map_data = None
  cache_path = f'../../temp/cache/dem/{tile_name}.json'
  if(tile_name in dem_cache) :
    map_data = dem_cache[tile_name]
  elif (os.path.exists(cache_path)) :
    with open(cache_path,mode='r') as f:
      map_data = dem_cache[tile_name] = json.load(f)['features']
  else :
    json_url = f'https://cyberjapandata.gsi.go.jp/xyz/experimental_dem10b/18/{x}/{y}.geojson'
    json_str = requests.get(json_url).text
    map_data = dem_cache[tile_name] = json.loads(json_str)['features']
    with open(f'../../temp/cache/dem/{tile_name}.json',mode="w") as f:
      f.write(json_str)
  return map_data



def get_tile_num_np(coords,zoom):
  # https:#wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Python
  lat_rad = np.radians(coords[:,1])
  n = 2.0 ** zoom
  xtile = (coords[:,0] + 180.0) / 360.0 * n
  ytile = (1.0 - np.log(np.tan(lat_rad) + (1 / np.cos(lat_rad))) / np.pi) / 2.0 * n
  return (xtile, ytile)

work_dir = '../../temp/'
with open(f'{work_dir}test.json','r') as f :
  root_map_str = f.read()

root_map = json.loads(root_map_str)

coords = np.array(root_map['features'][0]['geometry']['coordinates'])
coords = coords[:,0:2]
coordst = get_tile_num_np(coords,18)
coords = np.stack(coordst).T
#root_line = shapely.geometry.LineString(coords)

maps = {}
fids = {}
classMap = {}
h_minimum_polygon = None

point_pairs = np.hstack((coords[:-1],coords[1:]))
point_pairs = point_pairs.reshape([-1,2,2])
for point_pair in point_pairs : 
  p = geometry.LineString(point_pair).buffer(2,16,None,geometry.CAP_STYLE.square,geometry.CAP_STYLE.square)
  b = np.round(p.bounds).astype(np.int32)
  xstart = b[0] if b[0] < b[2] else b[2]
  xend = b[0] if b[0] > b[2] else  b[2] 

  xend = (xend + 1) if b[0] == b[2] else xend 
  
  ystart = (b[1] if b[1] < b[3] else  b[3] ) 
  yend = (b[1] if b[1] > b[3] else  b[3])  
  yend = (yend + 1) if b[0] == b[2] else yend 

  bld_re = re.compile(r'Bld')


  for y in range(ystart,yend,1) :
    for x in range(xstart,xend,1) :
      if(p.contains(geometry.Point(x,y))) :
        xmax = 0.0
        xmin = 999.
        ymin = 999.
        ymax = 0.

        map_name = f'{x}_{y}'
        
        map = None
        if(map_name not in maps) :
          cache_file = f'{work_dir}cache/fgd/fgd{x}_{y}.json'
          if(os.path.exists(cache_file)) :
            map = json.load(open(cache_file,'r'))
          else :
            map_text = requests.get(f'https://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/18/{x}/{y}.geojson').text
            map = json.loads(map_text)
            # cache fileとして保存
            with open(cache_file,mode="w") as f:
              f.write(map_text)
          maps[map_name] = map
          # 不要な featureを除去する
          features = map['features']
          for feature in features :
            co = np.array(feature['geometry']['coordinates'])
            if(feature['geometry']['type'] == 'LineString') :
              xmax = max(xmax,np.max(co[:,0]))
              xmin = min(xmin,np.min(co[:,0]))
              ymax = max(ymax,np.max(co[:,1]))
              ymin = min(ymin,np.min(co[:,1]))
            elif (feature['geometry']['type'] == 'Point') :
              xmax = max(xmax,co[0])
              xmin = min(xmin,co[0])
              ymax = max(ymax,co[1])
              ymin = min(ymin,co[1])
            feature_props = feature['properties']
            if(bld_re.match(feature_props['class'])) :
              f_item = {'featureCollection':features,'feature':feature,'map':map}
              fid = feature_props['fid']
                            
              if(fid in fids) :
                flst = fids[fid]
                inserted = False
                for i in range(0,len(flst)) :
                  f = flst[i]
                  f_coords = f['feature']['geometry']['coordinates']
                  f_idx_last = len(f_coords) - 1
                  fi_coords = f_item['feature']['geometry']['coordinates']
                  fi_idx_last = len(fi_coords) - 1
                  if(f_coords[0][0] == fi_coords[fi_idx_last][0] and f_coords[0][1] == fi_coords[fi_idx_last][1]) :
                    flst.insert(i,f_item)
                    inserted = True
                    break
                if(not inserted) :
                    flst.append(f_item)
              else :
                fids[fid] = [f_item]
    
          features = map['features'] = [feature for feature in map['features'] if 'type' in feature['properties'] and feature['properties']['type'] not in exclude_types]

          # 高さデータの取得
          dems_flat = [(f['geometry']['coordinates'][0],f['geometry']['coordinates'][1],f['properties']['alti']) for f in get_dem(x,y)]

          # dems_y = list(set([f['geometry']['coordinates'][1] for f in get_dem(x,y)]))
          # dems_y.sort()
          #dems = np.array([[y] for y in dems_y[0:-1]])
          #dems = np.column_stack((dems,dems_y[1:]))



          # dems = np.dstack([dems_y[0:-1],dems_y[1:]])
          
          
          #dems = [[yd,[]] for yd in dems_y]
          

          # for yd in dems :
          #   yd_val = yd[1]
          #   for yf in dems_flat : 
          #     if(yf[0] == yd[0]) :
          #       yd_val.append((yf[1],yf[2]))
            # yd_val.sort(key=lambda v : v[0])
            # yd_val1 = np.array([[xd[0]] for xd in yd_val[0:-1]])

          # if(h_minimum_polygon == None) :
          #   h_x1 = 0
          #   h_w = dems_flat[1][1] - dems_flat[0][1]
          #   h_h = dems_y[1] - dems_y[0]
          #   h_area = h_w * h_h
          #   h_minimum_polygon = geometry.Polygon(
          #     ( (dems_flat[0][1],dems_y[0]),(dems_flat[1][1],dems_y[0]),
          #       (dems_flat[1][1],dems_y[1]),(dems_flat[0][1],dems_y[1])))

          #df = pd.DataFrame({'y':heights[:,0],'x':heights[:,1],'height':heights[:,2]})
          #pv = df.pivot(index='y',columns='x',values='height')
          #print(pv[:])
          dems = [(geometry.Point(f[0],f[1]),f[2]) for f in dems_flat]
          map['attributes'] = {
            'xmin':xmin ,
            'xmax':xmax ,
            'ymin':ymin ,
            'ymax':ymax ,
            'width':xmax - xmin ,
            'height':ymax - ymin ,
            'dems_flat':dems_flat,
            'dems':dems
            }


      # else :
      #   print(f'not contain:{b}')

# 分割された建物データを結合し、矩形に単純化する
for fid in fids.values() :
  coords = fid[0]['feature']['geometry']['coordinates']
  target_fid = fid[0]['feature']['properties']['fid']
  for f in fid[1:]:
    coords += f['feature']['geometry']['coordinates']
    f['feature']['properties']['delete']  = True

  if(len(coords) > 2) :
    mp = geometry.Polygon(coords)
  else :
    mp = geometry.LineString(coords)
  
  target = mp
  convex_hull = mp.convex_hull

  def simplize_1(target) :
    rect = target.minimum_rotated_rectangle
    convex_hull = target.convex_hull

    x1,y1 = rect.centroid.xy
    x2,y2 = target.centroid.xy
    x1,y1 = x1[0],y1[0]
    x2,y2 = x2[0],y2[0]

    translated_rect = affinity.translate(rect,x2-x1,y2-y1)
    rates = np.empty(0)
    min_rate = None
    for pt in translated_rect.exterior.coords :
      lst = geometry.LineString((pt,(x2,y2)))
      intersects = convex_hull.intersection(lst)
      if(intersects.type == 'MultiLineString') :
        for i in intersects :
          rates = np.append(rates,i.length / lst.length)
          # if(min_rate == None) : 
          #     min_rate = i.length / lst.length)
          # else :
          #     min_rate = min(min_rate,i.length / lst.length)

      else :    
          rates = np.append(rates,intersects.length / lst.length)
        # if(min_rate == None) : 
        #     min_rate = intersects.length / lst.length
        #   #     min_rate = i.length / lst.length)
        # else :
        #     min_rate = min(min_rate,intersects.length / lst.length)

    rates = np.unique(rates)
    shrinked_rect = None
    for rate in rates :
      rect_s = affinity.scale(translated_rect,rate,rate,1.0,(x2,y2))
      if convex_hull.contains(rect_s) : 
        shrinked_rect = rect_s if shrinked_rect == None else max(rect_s,shrinked_rect,key=lambda r:r.area) 
    
    shrinked_rect = affinity.scale(translated_rect,np.min(rates),np.min(rates),1.0,(x2,y2))  if shrinked_rect == None else shrinked_rect
    #shrinked_rect = affinity.scale(translated_rect,min_rate,min_rate,1.0,(x2,y2))
    rect = geometry.mapping(shrinked_rect)['coordinates'][0]
    return rect,shrinked_rect
 
  try :
    # if(convex_hull.area == 0 or ((mp.area / convex_hull.area) > 0.7)) :
    #   rect = simplize_1(convex_hull)
    # else :
    rect,shrinked_rect = simplize_1(target)
    #x,y = get_tile_num(shrinked_rect.centroid.x,shrinked_rect.centroid.y,18)
    #dem = get_dem(int(x),int(y))
    #heights = [h['geometry']['coordinates'] for h in dem if shrinked_rect.contains(geometry.Point(*h['geometry']['coordinates']))]

    fid[0]['feature']['geometry']['coordinates'] = rect
    fid[0]['feature']['properties']['dsm'] = float(get_jaxa_dsm_height_rect(shrinked_rect))
    
    # demを求める
    dems = fid[0]['map']['attributes']['dems']
    fid[0]['feature']['properties']['dem'] = min([(shrinked_rect.distance(d[0]),d[1]) for d in dems],key=lambda d : d[0])[1]

    if(fid[0]['feature']['properties']['dem'] > fid[0]['feature']['properties']['dsm']) :
      temp = fid[0]['feature']['properties']['dem']
      fid[0]['feature']['properties']['dem'] =  fid[0]['feature']['properties']['dsm']
      fid[0]['feature']['properties']['dsm'] =  temp


    
    feature_height = fid[0]['feature']['properties']['height'] = fid[0]['feature']['properties']['dsm'] - fid[0]['feature']['properties']['dem']
    feature_type = fid[0]['feature']['properties']['type']
    # 建物の高さ補正
    if(feature_type == '普通建物' and feature_height < 3.0) : 
      fid[0]['feature']['properties']['height'] += 3.0
    elif (feature_type == '堅ろう建物') :
      if(feature_height < 6.0) : 
        fid[0]['feature']['properties']['height'] += 9.0
      elif (feature_height < 9.0) : 
        fid[0]['feature']['properties']['height'] = 9.0


    fid[0]['feature']['properties']['tg_cv_rate'] = (target.area / target.convex_hull.area) if target.convex_hull.area > 0 else 0
    fid[0]['feature']['properties']['tg_min_rate'] = (shrinked_rect.area / target.area) if target.area > 0 else 0

  except Exception as e:
    print(e)
    #fid[0]['feature']['geometry']['coordinates'] = geometry.mapping(target.minimum_rotated_rectangle)['coordinates'][0]
    fid[0]['feature']['properties']['delete'] = True
 
map_sizes = np.array([(i['attributes']['width'],i['attributes']['height']) for i in maps.values()])
avg_width = np.average(map_sizes[:,0])
avg_height = np.average(map_sizes[:,1])

for k,m in maps.items() :
  features = m['features'] = [feature for feature in m['features'] if ('delete' not in feature['properties'])]
  m['key'] = k 
  for f in features :
    props =  f['properties']
    del props['lfSpanFr'],props['lfSpanTo'],props['devDate'],props['orgGILvl'],props['orgMDId'],props['vis']
    if('admOffice' in props) : del props['admOffice']
    if(('name' in props) and (props['name'] == '')) : del props['name']
for map in maps :
  del maps[map]['attributes']['dems']

maps_json = json.dumps({'maps':list(maps.values()),'attributes':{'avgWidth':avg_width,'avgHeight':avg_height}})

with open(f'{work_dir}merged.json',mode="w") as f:
  f.write(maps_json)

with open(f'{work_dir}scrollMap.json',mode="w") as f:
  f.write(root_map_str)

elapsed_time = time.time() - start
print ("while_time:{0}".format(elapsed_time) + "[sec]")