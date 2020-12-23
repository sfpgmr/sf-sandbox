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

#import latlon2tile as l2t
#from maxrect import get_intersection,get_maximal_rectangle,rect2poly

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
    prob.solve()
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

def get_tile_num(coords,zoom):
  # https:#wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Python
  lat_rad = np.radians(coords[:,1])
  n = 2.0 ** zoom
  xtile = (coords[:,0] + 180.0) / 360.0 * n
  ytile = (1.0 - np.log(np.tan(lat_rad) + (1 / np.cos(lat_rad))) / np.pi) / 2.0 * n
  return (xtile, ytile)

work_dir = '../../temp/'
with open(f'{work_dir}tokyo.json','r') as f :
  root_map_str = f.read()

root_map = json.loads(root_map_str)

coords = np.array(root_map['features'][0]['geometry']['coordinates'])
coords = coords[:,0:2]
coordst = get_tile_num(coords,18)
coords = np.stack(coordst).T
#root_line = shapely.geometry.LineString(coords)

maps = {}
fids = {}
classMap = {}

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

        print(f'contain:{b}')
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
              fid = feature_props['fid']
              if(fid in fids) :
                fids[fid].append({'featureCollection':features,'feature':feature})
              else :
                fids[fid] = [{'featureCollection':features,'feature':feature}]
    
          features = map['features'] = [feature for feature in map['features'] if feature['properties']['type'] not in exclude_types]

          map['attributes'] = {
            'xmin':xmin ,
            'xmax':xmax ,
            'ymin':ymin ,
            'ymax':ymax ,
            'width':xmax - xmin ,
            'height':ymax - ymin 
            }
      # else :
      #   print(f'not contain:{b}')

# 分割された建物データを結合し、矩形に単純化する

for fid in fids.values() :
  coords = fid[0]['feature']['geometry']['coordinates']
  target_fid = fid[0]['feature']['properties']['fid']
  for f in fid[1:]:
    coords += f['feature']['geometry']['coordinates']
    fc =  f['featureCollection']
    f['feature']['properties']['delete']  = True

  mp = geometry.MultiPoint(coords)
  
  try :
    # Convex Hullを求める
    polygon = mp.convex_hull
    # coords = geometry.mapping(polygon)['coordinates'][0]
    # #一番長い辺を見つけ、それを軸との角度を求めポリゴンを回転させる
    # max_distance = 0
    # max_distance_index = 0
    # max_distance_vect = None
    # for i in range(0,len(coords) - 1,1) :
    #   vect = (geometry.Point(coords[i][0],coords[i][1]),geometry.Point(coords[i+1][0],coords[i+1][1]))
    #   distance = vect[0].distance(vect[1])
    #   if(max_distance < distance) :
    #     max_distance_index = i
    #     max_distance = distance
    #     max_distance_vect = vect

    
    # max_distance_vect[0]
    #rad = math.atan2(max_distance_vect[1].y - max_distance_vect[0].y,max_distance_vect[1].x - max_distance_vect[0].x)
    #polygon = affinity.rotate(polygon,rad,'centroid',use_radians=True)   
  
    #rect = Polygon(get_maximal_rectangle(geometry.mapping(polygon)['coordinates'][0]))
    rect = get_maximal_rectangle(geometry.mapping(polygon)['coordinates'][0])
    # 逆回転させる
    # polygon = affinity.rotate(rect,rad,'centroid',use_radians=True)
    # rect = geometry.mapping(polygon)['coordinates'][0]
  except :
    rect = geometry.mapping(mp.convex_hull.minimum_rotated_rectangle)['coordinates'][0]
  fid[0]['feature']['geometry']['coordinates'] = rect
  # print(rect)
  
map_sizes = np.array([(i['attributes']['width'],i['attributes']['height']) for i in maps.values()])
avg_width = np.average(map_sizes[:,0])
avg_height = np.average(map_sizes[:,1])

for m in maps.values() :
  m['features'] = [feature for feature in m['features'] if 'delete' not in feature['properties']]

maps_json = json.dumps({'maps':list(maps.values()),'attributes':{'avgWidth':avg_width,'avgHeight':avg_height}})

with open(f'{work_dir}merged.json',mode="w") as f:
  f.write(maps_json)

with open(f'{work_dir}scrollMap.json',mode="w") as f:
  f.write(root_map_str)
