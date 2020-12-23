(function () {
  'use strict';

  //The MIT License (MIT)

  let display = true;
  let play = false;
  // メイン
  window.addEventListener('load', async ()=>{

    var WIDTH = window.innerWidth , HEIGHT = window.innerHeight;

    let playButton = document.getElementById('playbutton');
    playButton.addEventListener('click',function(){

      if(display){
        play = !play;
        if(play){
          playButton.setAttribute('class','hidden');
          playButton.innerHTML = 'stop';
          display = false;
        } else {
          playButton.setAttribute('class','active');
          playButton.innerHTML = 'play';
        }
      } else {
        playButton.setAttribute('class','active1');
        display = true;
      }    
    });

  });

}());
