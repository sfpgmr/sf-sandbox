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

// リリース時にはコメントアウトすること

"use strict";

import MiniMasonry from './minimasonry.js';

// メイン
  const contents = document.getElementById('contents');
var masonry;
(async ()=> {
await contents.displayLock.acquire({ timeout: Infinity });
masonry = new MiniMasonry({
  container: '.contents',
  minimize:false,
  gutter:4,
  baseWidth:400
}); 

window.twttr = (()=>{
  const s = 'script',d = document,id = 'twitter-wjs';
  var js, fjs = d.getElementsByTagName(s)[0],
  t = window.twttr || {};
  if (d.getElementById(id)) return t;
  js = d.createElement(s);
  js.id = id;
  js.src = "https://platform.twitter.com/widgets.js";
  fjs.parentNode.insertBefore(js, fjs);

  t._e = [];
  t.ready = function(f) {
    t._e.push(f);
  };
  return t;
})();
window.addEventListener('load', async ()=>{
  twttr.ready(()=>{
    twttr.events.bind('rendered',async ()=>{
      const tweets = document.querySelectorAll('twitter-widget');
      tweets.forEach(t=>{
        t.style.position = 'absolute';
      })
      masonry.layout();
      await contents.displayLock.updateAndCommit();
    });
  });

  //twttr.events.bind('rendered',masonry.layout.bind(masonry));

  window.addEventListener('resize',masonry.layout.bind(masonry)); 
});



})();


