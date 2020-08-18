(function () {
  'use strict';

  class MiniMasonry {

    constructor(conf) {
      this._sizes = [];
      this._columns = [];
      this._container = null;
      this._count = null;
      this._width = 0;
      this._gutter = 0;

      this._resizeTimeout = null,

        this.conf = {
          baseWidth: 255,
          gutter: 4,
          container: null,
          minify: true
        };

        this.resizeObserver = new ResizeObserver(entries => {
          this.resizeThrottler(entries);
        });
        this.init(conf);
    

    }

    init(conf) {
      for (var i in this.conf) {
        if (conf[i] != undefined) {
          this.conf[i] = conf[i];
        }
      }
      this._container = document.querySelector(this.conf.container);
      if (!this._container) {
        throw new Error('Container not found or missing');
      }

      const children = this._container.querySelectorAll(this.conf.container + ' > *');
      children.forEach(c=>{
        this.resizeObserver.observe(c);
      });

      //this._container.
      //window.addEventListener("resize", this.resizeThrottler.bind(this));


      //this._resizeObserver.observe(this._container);
      //this.layout();
    };

    reset() {
      this._sizes = [];
      this._columns = [];
      this._count = null;
      this._width = this._container.clientWidth;
      var minWidth = ((2 * this.conf.gutter) + this.conf.baseWidth);
      if (this._width < minWidth) {
        this._width = minWidth;
        this._container.style.minWidth = minWidth + 'px';
      }
      this._gutter = this.conf.gutter;
      if (this._width < 530) {
        this._gutter = 5;
      }
    };

    layout() {
      if (!this._container) {
        console.error('Container not found');
        return;
      }
      this.reset();

      //Computing columns width
      this._count = Math.floor((this._width - this._gutter) / (this.conf.baseWidth + this.conf.gutter));
      var width = ((this._width - this._gutter) / this._count) - this._gutter;

      for (var i = 0; i < this._count; i++) {
        this._columns[i] = 0;
      }


      //Saving children real heights
      var children = this._container.querySelectorAll(this.conf.container + ' > *');
      for (var k = 0; k < children.length; k++) {
        children[k].style.width = Math.round(width) + 'px';
        this._sizes[k] = children[k].clientHeight;
      }

      //If more columns than children
      var initialLeft = this._gutter;
      if (this._count > this._sizes.length) {
        initialLeft = (((this._width - (this._sizes.length * width)) - this._gutter) / 2) - this._gutter;
      }

      //Computing position of children
      for (var index = 0; index < children.length; index++) {
        var shortest = this.conf.minify ? this.getShortest() : this.getNextColumn(index);

        var x = initialLeft + ((width + this._gutter) * (shortest));
        var y = this._columns[shortest];


        children[index].style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) + 'px,0)';

        this._columns[shortest] += this._sizes[index] + this.conf.gutter;//margin-bottom
      }

      this._container.style.height = this._columns[this.getLongest()] + 'px';
    };

    getNextColumn(index) {
      return index % this._columns.length;
    };

    getShortest() {
      var shortest = 0;
      for (var i = 0; i < this._count; i++) {
        if (this._columns[i] < this._columns[shortest]) {
          shortest = i;
        }
      }

      return shortest;
    };

    getLongest() {
      var longest = 0;
      for (var i = 0; i < this._count; i++) {
        if (this._columns[i] > this._columns[longest]) {
          longest = i;
        }
      }

      return longest;
    };

    resizeThrottler(e) {
      //console.log(e);
      // e.forEach(ec=>{
      //   this.resizeObserver.unobserve(ec.target);
      // })
      //const contentRect =  e[0].contentRect;
      // ignore resize events as long as an actualResizeHandler execution is in the queue
      if (!this._resizeTimeout /*&& (!this.contentRect) ||  
          (this.contentRect && ((this.contentRect.width != contentRect.width) || (this.contentRect.height != contentRect.height)))
          */) {

        this._resizeTimeout = setTimeout(function () {
          this._resizeTimeout = null;
          //IOS Safari throw random resize event on scroll, call layout only if size has changed
          //if (this._container.clientWidth != this._width) {
            this.layout();
          //}
          // The actualResizeHandler will execute at a rate of 15fps
        }.bind(this), 66);
      }
    }
  }

  //The MIT License (MIT)

  const masonry = new MiniMasonry({
    container: '.contents',
    minimize: false,
    gutter: 16,
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

  function setYTPlayer(yt) {
    yt.addEventListener('click', () => {
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
        playerVars: {
          origin: origin,
          autoplay: 1
        }
      });
      yt.remove();
    });

  }

  window.onYouTubeIframeAPIReady = function () {
    const yts = document.querySelectorAll(".youtube");
    yts.forEach(setYTPlayer);
  };

  let observer;
  let MaxContents;

  let cacheContentNo = ((p) => {
    const m = (/index(\d+)\.html/i).exec(p);
    if (m) {
      return parseInt(m[1]) + 1;
    }

    return 1;
  })(location.pathname);

  const domparser = new DOMParser();

  async function fetchArticles() {
    if (cacheContentNo > MaxContents) {
      return null;
    }
    console.log(cacheContentNo);
    let content = await fetch(`./index${cacheContentNo++}.html`);

    const dom = domparser.parseFromString(await content.text(), 'text/html');
    const yts = dom.querySelectorAll(".youtube");
    return { articles: dom.querySelectorAll('#contents > article'), yts: yts };
  }

  let cacheArticles = fetchArticles();
  // 後ほど、監視を中止
  //observer.disconnect();

  window.addEventListener('load', async () => {
    const metaData = await (await fetch('./metaData.json')).json();
    MaxContents = metaData.maxContents;
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
    let isIntersecting = false;
    observer = new IntersectionObserver(changes => {
      const c = changes[0];
      if (c.isIntersecting) {
        isIntersecting = true;
        (async () => {
          while (isIntersecting) {
            let { articles, yts } = await cacheArticles;
            //
            if (articles && articles.length) {
              yts && yts.length && yts.forEach(setYTPlayer);
              document.getElementById('contents').append(...articles);
              articles.forEach(a => {
                masonry.resizeObserver.observe(a);
              });
              //              articles.forEach(a => { a.getBoundingClientRect(); a.style.opacity = 1.0; });
            }

            if (cacheContentNo > MaxContents) {
              //masonry.layout();
              observer.unobserve(sentinel);
              isIntersecting = false;
              return;
            } else {
              //masonry.layout();
              cacheArticles = fetchArticles();
            }
            //少しスリープする
            // await new Promise((resolve, reject) => {
            //   setTimeout(() => {
            //     resolve();
            //   }, 0);
            // });
          }
        })();
      } else {
        //masonry.layout();
        isIntersecting = false;
      }
      // console.log(c.boundingClientRect.height, c.intersectionRect.height, c.rootBounds.height, c.intersectionRatio, c.isIntersecting, c.isVisible);
    }, {
      root: null,
      rootMargin: Math.round(window.innerHeight * 1.2) + 'px'/*,threshold:[0.0,0.5,1.0]*/
    });

    const sentinel = document.createElement('div');
    sentinel.id = 'sentinel';
    document.body.append(sentinel);
    observer.observe(sentinel);
    document.querySelectorAll('.contents > article').forEach(s => {
      s.style.opacity = 1;
    });

    document.querySelector('body > header').addEventListener('click', () => {
      masonry.layout();
    });

    window.addEventListener('resize', () => {
      masonry.layout();
    });
    //masonry.layout();
    //twttr.events.bind('rendered',masonry.layout.bind(masonry));

  });

}());
