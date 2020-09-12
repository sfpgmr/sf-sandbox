"use strict";

// イメージをロードする
export function loadImage(url) {
  return new Promise((resolve,reject)=>{
    var image = new Image();
    try {
      image.src = url;
      image.onload = ()=>{
        resolve(image);
      };
    } catch (e){
      reject(e);
    }
   });
}

// 

// /// テクスチャーとしてcanvasを使う場合のヘルパー
// export function CanvasTexture(gl,width, height) {


//   this.canvas = document.createElement('canvas');
//   this.canvas.width = width || sfg.game.console.VIRTUAL_WIDTH;
//   this.canvas.height = height || sfg.game.console.VIRTUAL_HEIGHT;
//   this.ctx = this.canvas.getContext('2d');

//   const texture = this.texture = gl.createTexture();
  
//   this.texture = new THREE.Texture(this.canvas);
//   this.texture.magFilter = THREE.NearestFilter;
//   this.texture.minFilter = THREE.LinearMipMapLinearFilter;
//   this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
//   this.geometry = new THREE.PlaneGeometry(this.canvas.width, this.canvas.height);
//   this.mesh = new THREE.Mesh(this.geometry, this.material);
//   this.mesh.position.z = 0.001;
//   // スムージングを切る
//   this.ctx.msImageSmoothingEnabled = false;
//   this.ctx.imageSmoothingEnabled = false;
//   //this.ctx.webkitImageSmoothingEnabled = false;
//   this.ctx.mozImageSmoothingEnabled = false;
// }



// /// プログレスバー表示クラス
// export function Progress() {
//   this.canvas = document.createElement('canvas');;
//   var width = 1;
//   while (width <= sfg.game.console.VIRTUAL_WIDTH){
//     width *= 2;
//   }
//   var height = 1;
//   while (height <= sfg.game.console.VIRTUAL_HEIGHT){
//     height *= 2;
//   }
//   this.canvas.width = width;
//   this.canvas.height = height;
//   this.ctx = this.canvas.getContext('2d');
//   this.texture = new THREE.Texture(this.canvas);
//   this.texture.magFilter = THREE.NearestFilter;
//   this.texture.minFilter = THREE.LinearMipMapLinearFilter;
//   // スムージングを切る
//   this.ctx.msImageSmoothingEnabled = false;
//   this.ctx.imageSmoothingEnabled = false;
//   //this.ctx.webkitImageSmoothingEnabled = false;
//   this.ctx.mozImageSmoothingEnabled = false;

//   this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true });
//   this.geometry = new THREE.PlaneGeometry(this.canvas.width, this.canvas.height);
//   this.mesh = new THREE.Mesh(this.geometry, this.material);
//   this.mesh.position.x = (width - sfg.game.console.VIRTUAL_WIDTH) / 2;
//   this.mesh.position.y =  - (height - sfg.game.console.VIRTUAL_HEIGHT) / 2;

//   //this.texture.premultiplyAlpha = true;
// }

// /// プログレスバーを表示する。
// Progress.prototype.render = function (message, percent) {
//   var ctx = this.ctx;
//   var width = this.canvas.width, height = this.canvas.height;
//   //      ctx.fillStyle = 'rgba(0,0,0,0)';
//   ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
//   var textWidth = ctx.measureText(message).width;
//   ctx.strokeStyle = ctx.fillStyle = 'rgba(255,255,255,1.0)';

//   ctx.fillText(message, (width - textWidth) / 2, 100);
//   ctx.beginPath();
//   ctx.rect(20, 75, width - 20 * 2, 10);
//   ctx.stroke();
//   ctx.fillRect(20, 75, (width - 20 * 2) * percent / 100, 10);
//   this.texture.needsUpdate = true;
// }

// /// imgからジオメトリを作成する
// export function createGeometryFromImage(image) {
//   var canvas = document.createElement('canvas');
//   var w = textureFiles.author.texture.image.width;
//   var h = textureFiles.author.texture.image.height;
//   canvas.width = w;
//   canvas.height = h;
//   var ctx = canvas.getContext('2d');
//   ctx.drawImage(image, 0, 0);
//   var data = ctx.getImageData(0, 0, w, h);
//   var geometry = new THREE.Geometry();
//   {
//     var i = 0;

//     for (var y = 0; y < h; ++y) {
//       for (var x = 0; x < w; ++x) {
//         var color = new THREE.Color();

//         var r = data.data[i++];
//         var g = data.data[i++];
//         var b = data.data[i++];
//         var a = data.data[i++];
//         if (a != 0) {
//           color.setRGB(r / 255.0, g / 255.0, b / 255.0);
//           var vert = new THREE.Vector3(((x - w / 2.0)) * 2.0, ((y - h / 2)) * -2.0, 0.0);
//           geometry.vertices.push(vert);
//           geometry.colors.push(color);
//         }
//       }
//     }
//   }
// }

// export function createSpriteGeometry(size)
// {
//   var geometry = new THREE.Geometry();
//   var sizeHalf = size / 2;
//   // geometry.
//   geometry.vertices.push(new THREE.Vector3(-sizeHalf, sizeHalf, 0));
//   geometry.vertices.push(new THREE.Vector3(sizeHalf, sizeHalf, 0));
//   geometry.vertices.push(new THREE.Vector3(sizeHalf, -sizeHalf, 0));
//   geometry.vertices.push(new THREE.Vector3(-sizeHalf, -sizeHalf, 0));
//   geometry.faces.push(new THREE.Face3(0, 2, 1));
//   geometry.faces.push(new THREE.Face3(0, 3, 2));
//   return geometry;
// }

// /// テクスチャー上の指定スプライトのUV座標を求める
// export function createSpriteUV(geometry, texture, cellWidth, cellHeight, cellNo)
// {
//   var width = texture.image.width;
//   var height = texture.image.height;

//   var uCellCount = (width / cellWidth) | 0;
//   var vCellCount = (height / cellHeight) | 0;
//   var vPos = vCellCount - ((cellNo / uCellCount) | 0);
//   var uPos = cellNo % uCellCount;
//   var uUnit = cellWidth / width; 
//   var vUnit = cellHeight / height;

//   geometry.faceVertexUvs[0].push([
//     new THREE.Vector2((uPos) * cellWidth / width, (vPos) * cellHeight / height),
//     new THREE.Vector2((uPos + 1) * cellWidth / width, (vPos - 1) * cellHeight / height),
//     new THREE.Vector2((uPos + 1) * cellWidth / width, (vPos) * cellHeight / height)
//   ]);
//   geometry.faceVertexUvs[0].push([
//     new THREE.Vector2((uPos) * cellWidth / width, (vPos) * cellHeight / height),
//     new THREE.Vector2((uPos) * cellWidth / width, (vPos - 1) * cellHeight / height),
//     new THREE.Vector2((uPos + 1) * cellWidth / width, (vPos - 1) * cellHeight / height)
//   ]);
// }

// export function updateSpriteUV(geometry, texture, cellWidth, cellHeight, cellNo)
// {
//   var width = texture.image.width;
//   var height = texture.image.height;

//   var uCellCount = (width / cellWidth) | 0;
//   var vCellCount = (height / cellHeight) | 0;
//   var vPos = vCellCount - ((cellNo / uCellCount) | 0);
//   var uPos = cellNo % uCellCount;
//   var uUnit = cellWidth / width;
//   var vUnit = cellHeight / height;
//   var uvs = geometry.faceVertexUvs[0][0];

//   uvs[0].x = (uPos) * uUnit;
//   uvs[0].y = (vPos) * vUnit;
//   uvs[1].x = (uPos + 1) * uUnit;
//   uvs[1].y = (vPos - 1) * vUnit;
//   uvs[2].x = (uPos + 1) * uUnit;
//   uvs[2].y = (vPos) * vUnit;

//   uvs = geometry.faceVertexUvs[0][1];

//   uvs[0].x = (uPos) * uUnit;
//   uvs[0].y = (vPos) * vUnit;
//   uvs[1].x = (uPos) * uUnit;
//   uvs[1].y = (vPos - 1) * vUnit;
//   uvs[2].x = (uPos + 1) * uUnit;
//   uvs[2].y = (vPos - 1) * vUnit;

 
//   geometry.uvsNeedUpdate = true;

// }

// export function createSpriteMaterial(texture)
// {
//   // メッシュの作成・表示 ///
//   var material = new THREE.MeshBasicMaterial({ map: texture /*,depthTest:true*/, transparent: true });
//   material.flatShading = true;
//   material.side = THREE.FrontSide;
//   material.alphaTest = 0.5;
//   material.needsUpdate = true;
// //  material.
//   return material;
// }


