(function () {
  'use strict';

  //The MIT License (MIT)

  // メイン
  window.addEventListener('load', async ()=>{

    var WIDTH = window.innerWidth , HEIGHT = window.innerHeight;

    window.addEventListener( 'resize', ()=>{
          WIDTH = window.innerWidth;
          HEIGHT = window.innerHeight;
  				renderer.setSize(WIDTH,HEIGHT);
          composer.setSize(WIDTH,HEIGHT);
    }
    , false );
    
  });

}());
