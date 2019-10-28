(function () {
  'use strict';

  //The MIT License (MIT)

  // メイン
  var masonry = new MiniMasonry({
    container: '.contents'
  });  
  window.addEventListener('load', ()=>{
    masonry.layout();

  });

}());
