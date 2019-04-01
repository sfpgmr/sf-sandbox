//The MIT License (MIT)
//
//Copyright (c) 2015 Satoshi Fujiwara
//
//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:
//
//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.
//
//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

"use strict";

// Node.js で動作しているか
(function () {

  var SF = {};

  // http://blog.livedoor.jp/dankogai/archives/51756459.html より
  var getFunctionName = function(f){
    return 'name' in f
        ? f.name
        : (''+f).replace(/^\s*function\s*([^\(]*)[\S\s]+$/im, '$1');
  };

  var typeOf = function(that){
    if (that === null)      return 'Null';
    if (that === undefined) return 'Undefined';
    var tc = that.constructor;
    return typeof(tc) === 'function'
        ? getFunctionName(tc) 
        : tc /* [object HTMLDocumentConstructor] など */;
  };

  function SerializationData(data,objInfo){
    this.meta = {type : objInfo.name};
    if(objInfo.transform){
      this.data = objInfo.transform(data);
    } else {
    this.data = {};
    for (var i in data) {
      if (typeof data[i] !== 'function') {
        this.data[i] = data[i].toJSON ? data[i].toJSON() : data[i];
      }
    }
    }
  }

  function makeFactory(constructor)
  {
    return function(json){
      return new (constructor.bind.apply(constructor,json.data));
    }
  }

  function makeFactory2(constructor){
    return function(json){
      var d = json.data;
      var params =  objArrays[json.meta.type].factory(d);
      var c = THREE[constructor].bind.apply(THREE[constructor],params);
      return new c();
    }
  }

  function makeParamArray(arr){
    return function(obj){
      return arr.map(function(d){
        return obj[d];
      });
    }
  }

  function toJSON(data,objInfo){
    return new SerializationData(data,objInfo);
  }

  function mapArray(array){
    if(array.meta){
      return array.data.map(function(d){
        return objArrays[array.meta.type].factory(d);
      }); 
    } else {
      return array.map(function(d){
        if(d.meta){
          return objArrays[d.meta.type].factory(d.data);
        } else {
          return d;
        }
        });
    }
  }

  // 対象オブジェクトのプロトタイプにtoJSONメソッドを定義する
  THREE.Array = function SFArray (name,array){
    this.meta = {type:name};
    this.data = array.map(function(d){
      return objArrays[name].transform(d) || d;
    });
  };

  // オブジェクト保存・生成クラス
  function ObjectInfo(objName,param){
    this.name = objName;
    if(param instanceof Array){
      this.toJSON = toJSON;
      this.transform = makeParamArray(param);
      this.factory = makeFactory(THREE[objName]);
    } else {
      this.toJSON = param.toJSON || toJSON;
      if(param.transform){
        if(param.transform instanceof Array){
          this.transform = makeParamArray(param.transform);
        } else {
          this.transform = param.transform;
        }
      } 
      if('factory' in param){
        if(param.factory instanceof THREE[objName]){
          this.factory = makeFactory(param.factory);
        } else {
          this.factory = param.factory;
        }
      } else {
        this.factory = makeFactory(THREE[objName]);
      }
    }
  }

  // オブジェクト保存・生成情報配列
  var objArrays2 = [
    ['Array',{factory:mapArray}],
    ['Vector2',['x','y']],
    ['Vector3',['x','y','z']],
    ['EllipseCurve',['aX','aY','xRadius','yRadius','aStartAngle','aEndAngle','aClockwise']],
    ['ArcCurve',['aX', 'aY', 'xRadius', 'aStartAngle', 'aEndAngle', 'aClockwise']],
    ['ClosedSplineCurve3',
      {
        factory:function (json) {
          var d = json.data;
          if(d){
            var points = objArrays[d.meta.type].factory(d.data);
            return new THREE.ClosedSplineCurve3(points);
          }
          return new THREE.ClosedSplineCurve3();
        },
        transform: function(d){
          if(d.points){
            return new THREE.Array('Vector3',points);
          } else {
            return null;
          }
        }
      }],
    ['CubicBezierCurve',{factory: makeFactory2('CubicBezierCurve'),transform:function (o){
          return new THREE.Array('Vector2',[o.v0,o.v1,o.v2,o.v3]);
        }
      }
    ],
    ['CubicBezierCurve3',{
        factory: makeFactory2('CubicBezierCurve3'),
        transform:function(o){
          return new THREE.Array('Vector3',[o.v0,o.v1,o.v2,o.v3]);
        }
      }
    ],
    ['LineCurve',{ 
        factory: makeFactory2('LineCurve'),
        transform:function(o){
          return new THREE.Array('Vector2',[o.v1,o.v2]);
        }
      }],
    ['LineCurve3',{
        factory: makeFactory2('LineCurve3'),
        transform:function(o){
          return new THREE.Array('Vector3',[o.v1,o.v2]);
        }
      }],
    ['QuadraticBezierCurve',{
        factory: makeFactory2('QuadraticBezierCurve'),
        transform:function(o){
          return new THREE.Array('Vector2',[o.v0,o.v1,o.v2]);
        }
      }],
    ['QuadraticBezierCurve3',{
        factory: makeFactory2('QuadraticBezierCurve3'),
        transform:function(o){
          return new THREE.Array('Vector3',[o.v0,o.v1,o.v2]);
        }
      }],
    ['SplineCurve',
      {
        factory:function (json) {
          var d = json.data;
          if(d){
            var points = objArrays[d.meta.type].factory(d.data);
            return new THREE.SplineCurve(points);
          }
          return new THREE.SplineCurve();
        },
        transform: function(d){
          if(d.points){
            return new THREE.Array('Vector2',points);
          } else {
            return null;
          }
        }
      }],
    ['SplineCurve3',
      {
        factory:function (json) {
          var d = json.data;
          if(d){
            var points = objArrays[d.meta.type].factory(d.data);
            return new THREE.SplineCurve3(points);
          }
          return new THREE.SplineCurve3();
        },
        transform: function(d){
          if(d.points){
            return new THREE.Array('Vector3',points);
          } else {
            return null;
          }
        }
      }],
    ['CurvePath',
      {
        factory:function (json) {
          var d = json.data;
          var o = json.data;
          var instance = new THREE.CurvePath();
          if('curves' in o){
            var curves = mapArray(o.curves);
            instance.curves = curves;
          }
          if('bends' in o){
            var bends = mapArray(o.bends);
            instance.bends = bends;
          }
          instance.autoClose = o.autoClose;
          return instance;
        }
      }],
    ['Path',
      {
        factory:function (json) {
          var o = json.data;
          var instance = new THREE.ShapePath();
          instance.currentPath = new THREE.Path();
          instance.subPaths.push(instance.currentPath);
          if('curves' in o){
            instance.currentPath.curves = mapArray(o.curves);
          }
          if('bends' in o){
            instance.currentPath.bends = mapArray(o.bends);
          }
          if('actions' in o){
            instance.currentPath.actions = mapArray(o.actions);
          }
          instance.currentPath.autoClose = o.autoClose;
          return instance;
        }
      }]
  ];

  var objArrays = {};

  objArrays2.forEach(function(d){
    objArrays[d[0]] = new ObjectInfo(d[0],d[1]);
  });
  
  for (var name in objArrays) {
    (function () {
      var name_ = name;
      var objInfo = objArrays[name_];
      var toJSON = objInfo.hasOwnProperty('toJSON') ? objInfo.toJSON : toJSONBase;
      THREE[name_].prototype.toJSON = function () {
        return toJSON(this, objInfo);
      };
    })();
  };

  function toJSONBase(obj, objInfo) {
    var json = {
      "meta": {
        "type": objInfo.name,
      },
      "data": {}
    };
    for (var i in obj) {
      if (typeof obj[i] !== 'function') {
        json.data[i] = obj[i].toJSON ? obj[i].toJSON() : obj[i];
      }
    }
    return json;
  }

  // Arrayを効率よくJSONデータ化
  function arrayToJSON(array,objInfo){
    if(this.length > 0){
      var json = {
        "meta": {
          "type": name,
        },
        "data": array.map(function(d){
          return ('toJSON' in d ) ? d.toJSON() : d;
        })
      }
      return json;
    } else {
      return this;
    }
  }

  SF.serialize = function(obj){
    var ret = JSON.stringify(obj);
    return ret;
  }

  SF.deserialize = function (json) {
    if (objArrays[json.meta.type]) {
      return objArrays[json.meta.type].factory(json);
    }
  }

  module.exports = SF;

})();

(function test () {
  //  // EllipseCurve
  //  var tobj = new THREE.EllipseCurve(1, 2, 3, 4, 5, 6, 7);
  //  console.log(tobj);
  //  var jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  var tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //  // ArcCurve 
  //  tobj = new THREE.ArcCurve(1, 2, 3, 4, 5, 6);
  //  console.log(tobj);
  //  jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //  // CubicBezierCurve
  //  tobj = new THREE.CubicBezierCurve(new THREE.Vector2(0, 0), new THREE.Vector2(1, 1), new THREE.Vector2(2, 2), new THREE.Vector2(3, 3));
  //  console.log(tobj);
  //  jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //  // CubicBezierCurve3
  //  tobj = new THREE.CubicBezierCurve(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1), new THREE.Vector3(2, 2, 2), new THREE.Vector3(3, 3, 3));
  //  console.log(tobj);
  //  jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //  // LineCurve
  //  tobj = new THREE.LineCurve(new THREE.Vector2(0, 0), new THREE.Vector2(1, 1));
  //  console.log(tobj);
  //  jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //  // LineCurve
  //  tobj = new THREE.LineCurve3(new THREE.Vector3(0, 0), new THREE.Vector3(1, 1));
  //  console.log(tobj);
  //  jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //  // QuadraticBezierCurve
  //  tobj = new THREE.QuadraticBezierCurve(new THREE.Vector2(0, 0), new THREE.Vector2(1, 1),new THREE.Vector2(2,2));
  //  console.log(tobj);
  //  jsonData = JSON.stringify(tobj);
  //  console.log(jsonData);
  //  tobj2 = SF.deserialize(JSON.parse(jsonData));
  //  console.log(tobj2);

  //// QuadraticBezierCurve3
  //THREE.QuadraticBezierCurve3.prototype.constructor = THREE.QuadraticBezierCurve3;
  //var tobj = new THREE.Vector3(0, 0, 0);//;new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0,0), new THREE.Vector3(1, 1,1),new THREE.Vector3(2,2,2));
  //console.log(tobj.__proto__.constructor);

  //var jsonData = JSON.stringify(tobj);
  //console.log(jsonData);
  //var tobj2 = SF.deserialize(JSON.parse(jsonData));
  //console.log(tobj2);

})();
