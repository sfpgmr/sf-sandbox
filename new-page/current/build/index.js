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
          gutter: 10,
          container: null,
          minify: true
        };

      this.init(conf);

      return this;
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
      window.addEventListener("resize", this.resizeThrottler.bind(this));

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

    resizeThrottler() {
      // ignore resize events as long as an actualResizeHandler execution is in the queue
      if (!this._resizeTimeout) {

        this._resizeTimeout = setTimeout(function () {
          this._resizeTimeout = null;
          //IOS Safari throw random resize event on scroll, call layout only if size has changed
          if (this._container.clientWidth != this._width) {
            this.layout();
          }
          // The actualResizeHandler will execute at a rate of 15fps
        }.bind(this), 66);
      }
    }
  }

  //The MIT License (MIT)

  window.twttr = (() => {
    const s = 'script', d = document, id = 'twitter-wjs';
    var js, fjs = d.getElementsByTagName(s)[0];
    var t = window.twttr || {};
    if (d.getElementById(id)) return t;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);
    t._e = [];
    t.ready = function (f) {
      t._e.push(f);
    };

    return t;
  })();

  let ct = 0;

  const masonry = new MiniMasonry({
    container: '.contents',
    minimize: false,
    gutter: 4,
    baseWidth: 255
  });

  twttr.ready(() => {
    twttr.events.bind('rendered', (e) => {
      ++ct;
      if(ct >= 200){
        const contents = document.querySelector('#contents');
        const tweets = document.querySelectorAll('twitter-widget');
        tweets.forEach(t => {
          t.style.position = 'absolute';
        });
        masonry.layout();
        contents.setAttribute('rendersubtree', '');
      }
      //masonry.layout();
    });
  });


    window.addEventListener('load', () => {

      //masonry.layout();
      //twttr.events.bind('rendered',masonry.layout.bind(masonry));

    });

}());
