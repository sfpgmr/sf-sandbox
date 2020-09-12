import numpy as np
import math

def get_tile_num(lat, lon, zoom):
    """
    緯度経度からタイル座標を取得する
    Parameters
    ----------
    lat : number 
        タイル座標を取得したい地点の緯度(deg) 
    lon : number 
        タイル座標を取得したい地点の経度(deg) 
    zoom : int 
        タイルのズーム率
    Returns
    -------
    xtile : number
        タイルのX座標
    ytile : number
        タイルのY座標
    """
    # https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Python
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = (lon + 180.0) / 360.0 * n
    ytile = (1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n
    return (xtile, ytile)

def get_tile_bbox(z, x, y):
    """
    タイル座標からバウンディングボックスを取得する
    https://tools.ietf.org/html/rfc7946#section-5
    Parameters
    ----------
    z : int 
        タイルのズーム率 
    x : int 
        タイルのX座標 
    y : int 
        タイルのY座標 
    Returns
    -------
    bbox: tuple of number
        タイルのバウンディングボックス
        (左下経度, 左下緯度, 右上経度, 右上緯度)
    """
    def num2deg(xtile, ytile, zoom):
        # https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Python
        n = 2.0 ** zoom
        lon_deg = xtile / n * 360.0 - 180.0
        lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
        lat_deg = math.degrees(lat_rad)
        return (lon_deg, lat_deg)
    
    right_top = num2deg(x + 1, y, z)
    left_bottom = num2deg(x, y + 1, z)
    return (left_bottom[0], left_bottom[1], right_top[0], right_top[1])