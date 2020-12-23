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

// window.twttr = (() => {
//   const s = 'script', d = document, id = 'twitter-wjs';
//   var js, fjs = d.getElementsByTagName(s)[0];
//   var t = window.twttr || {};
//   if (d.getElementById(id)) return t;
//   js = d.createElement(s);
//   js.id = id;
//   js.src = "https://platform.twitter.com/widgets.js";
//   fjs.parentNode.insertBefore(js, fjs);
//   t._e = [];
//   t.ready = function (f) {
//     t._e.push(f);     function onYouTubeIframeAPIReady() {
let ct = 0;

const masonry = new MiniMasonry({
  container: '.contents',
  minimize: false,
  gutter: 4,
  baseWidth: 320
});

// twttr.ready(() => {
//   // twttr.events.bind('rendered', (e) => {
//   //   ++ct;
//   //   if(ct >= 200){
//   //     const contents = document.querySelector('#contents');
//   //     const tweets = document.querySelectorAll('twitter-widget');
//   //     tweets.forEach(t => {
//   //       t.style.position = 'absolute';
//   //     });
//   //     contents.setAttribute('rendersubtree', '')
//   //   }
//   //   //masonry.layout();
//   // });
// });

window.onYouTubeIframeAPIReady = function() {
  const yts = document.querySelectorAll(".youtube");
  const origin = `${location.protocol}//${location.hostname}:${location.port}`;

  yts.forEach(yt => { 
    yt.addEventListener('click',()=>{
    //  const iframe = document.createElement('iframe'); 
    //  iframe.src = `https://www.youtube.com/embed/${yt.id}?autoplay=1&origin=${origin}`;
    //  iframe.width = yt.offsetWidth;
    //  iframe.height = yt.offsetHeight;
    //  iframe.frameBorder = 0;

     //yt.replaceWith(iframe);

     new YT.Player(yt.id, {
       height: yt.clientHeight,
       width: yt.clientWidth,
       videoId: yt.id,
       playerVars:{
         origin:origin, 
         autoplay: 1
        }
     });
     yt.remove();
    });
  });
  // yts.forEach(yt => {
  //   new YT.Player(yt.id, {
  //     height: yt.offsetHeight,
  //     width: yt.offsetWidth,
  //     videoId: yt.id,
  //     playerVars:{origin:origin}
  //   });
  // });

}

let observer;
const MaxContents = 23;

let cacheContentNo = ((p)=>{
  const m = (/index(\d+)\.html/i).exec(p);
  if(m){
    return parseInt(m[1]) + 1;
  } 
  
  return 1;
})(location.pathname);

const domparser = new DOMParser();

async function fetchArticles(){
  if(cacheContentNo >= MaxContents){
    return null;
  }
  console.log(cacheContentNo);
  let content = await fetch(`./index${cacheContentNo++}.html`);

  const dom = domparser.parseFromString(await content.text(),'text/html');
  return dom.querySelectorAll('#contents > article');
}

let cacheArticles = fetchArticles();

window.addEventListener('load', () => {
  const tag = document.createElement('script');
  tag.src = "//www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  document.getElementById('loading').remove();
  masonry.layout();

  const contents = document.getElementById('contents');
  contents.setAttribute('rendersubtree', '');
  // window.addEventListener('scroll',()=>{
  //   console.log(window.scrollY,document.body.offsetHeight);
  // },{passive: true})
  
  observer = new IntersectionObserver(changes=>{
    const c = changes[0];
    if(c.isIntersecting){
        (async ()=>{
          const articles = await cacheArticles;
          if(cacheContentNo < MaxContents){
            cacheArticles = fetchArticles();
          }
          if(cacheContentNo <= MaxContents){
            document.getElementById('contents').append(...articles);
            masonry.layout();
          } else {
            observer.unobserve(sentinel);
          }
         })();
    }
    console.log(c.boundingClientRect.height,c.intersectionRect.height,c.rootBounds.height,c.intersectionRatio,c.isIntersecting,c.isVisible);
  },{root: null,
    rootMargin: Math.round(window.innerHeight * 1.2) + 'px',threshold:[0.0,1.0]});

  const sentinel = document.createElement('span');
  sentinel.id = 'sentinel';
  document.body.append(sentinel);
  observer.observe(sentinel);
  //masonry.layout();
  //twttr.events.bind('rendered',masonry.layout.bind(masonry));

});
