const pi = Math.PI;
const e = Math.E;

// tile座標とズームレベルから緯度経度を求める
export function tile2latlon(x, y, z) {
  const lon = (x / 2.0 ** z) * 360 - 180;// # 経度（東経）
  const mapy = (y / 2.0 ** z) * 2 * pi - pi;
  const lat = 2 * Math.atan(e ** (- mapy)) * 180 / pi - 90;// # 緯度（北緯）
  return { lat: lat, lon: lon };
}

// 緯度経度からtile座標を求める
export function latlon2tile(lat, lon, z) {
  const x = ((lon / 180 + 1) * 2 ** z / 2);// # x座標
  const y = (((-Math.log(Math.tan((45 + lat / 2) * pi / 180)) + pi) * 2 ** z / (2 * pi)));// # y座標
  return { x: x, y: y };
}

