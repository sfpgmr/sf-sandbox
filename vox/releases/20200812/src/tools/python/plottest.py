from shapely.geometry import MultiPoint, Polygon, LineString
import shapely.geometry as g
from matplotlib import rcParams
rcParams['font.family'] = 'sans-serif'
rcParams['font.sans-serif'] = ['Noto Sans CJK JP']
import matplotlib.pyplot as plt
from descartes.patch import PolygonPatch
import numpy as np
from math import sqrt
from shapely import affinity
import os
import math
import requests
import re
import cvxpy
from itertools import islice



GM = (sqrt(5)-1.0)/2.0
W = 8.0
H = W*GM
SIZE = (W, H)

BLUE = '#6699cc'
GRAY = '#999999'
DARKGRAY = '#333333'
YELLOW = '#ffcc33'
GREEN = '#339933'
RED = '#ff3333'
BLACK = '#000000'

COLOR_ISVALID = {
    True: BLUE,
    False: RED,
}


fig = plt.figure(1, figsize=(10,5), dpi=72)
fig.set_frameon(True)

ls = LineString(
     [[135.499877929688,34.6653990447187],[135.499786056,34.665397306],[135.499786222,34.665370250],[135.499644361,34.665371917],[135.499644056,34.665423750],[135.499605861,34.665423611],[135.499602806,34.665477694],[135.499559167,34.665479750],[135.499558667,34.665568861]]
    )

rect = ls.minimum_rotated_rectangle

x1,y1 = rect.centroid.xy
x2,y2 = ls.convex_hull.centroid.xy

translated_rect = affinity.translate(rect,x2[0]-x1[0],y2[0]-y1[0])


#1
ax = fig.add_subplot(121)
ax.set_title('1.minimum rotated rectangle from convex hull')
ax.xaxis.set_visible(False)
ax.yaxis.set_visible(False)
ax.axis('equal')
ax.plot(*ls.xy, color=DARKGRAY, linewidth=1, alpha=0.5, zorder=10)
patch = PolygonPatch(ls.convex_hull, facecolor=YELLOW, edgecolor=YELLOW, alpha=0.25, zorder=2)
ax.add_patch(patch)
patch = PolygonPatch(rect, facecolor=RED, edgecolor=RED, alpha=0.5, zorder=3)
ax.add_patch(patch)

ax = fig.add_subplot(122)
ax.set_title('2.rectangle was moved to centroid of convex hull  ')
ax.xaxis.set_visible(False)
ax.yaxis.set_visible(False)
ax.axis('equal')
ax.plot(*ls.xy, color=DARKGRAY, linewidth=1, alpha=0.5, zorder=10)
patch = PolygonPatch(ls.convex_hull, facecolor=YELLOW, edgecolor=YELLOW, alpha=0.25, zorder=2)
ax.add_patch(patch)
patch = PolygonPatch(translated_rect, facecolor=RED, edgecolor=RED, alpha=0.5, zorder=3)
ax.add_patch(patch)

plt.show()