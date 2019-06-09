
window.addEventListener('load', () => {

  d3.selectAll('.nav-button')
    .on('click', function (d, i) {
      if (!this.sf_target) {
        this.sf_target = d3.select('.main-nav[data-sf-name="' + d3.select(this).attr('data-sf-target') + '"] .nav-items');
      }
      var target = this.sf_target;
      if (target) {
        if (target.classed('nav-display-default')) {
          target.classed('nav-display-default', false);
          target.classed('nav-display-toggle', true);
        } else {
          target.classed('nav-display-default', true);
          target.classed('nav-display-toggle', false);
        }
      }
    });

  d3.select('#scroll-top')
    .on('click', function () {
      d3
      .transition()
      .duration(500)
      .tween("scrolltop", scrollTopTween(0));    ;
    });
    
  function scrollTopTween(offset) {
    return function () {
      var i = d3.interpolateNumber(window.scrollY, offset);
      return function (t) { window.scroll(0,i(t)); };
    };
  }
});

let resizeTimer;
window.addEventListener('resize',()=>{
  if(resizeTimer){
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  resizeTimer = setTimeout(()=>{
    d3.selectAll('ins')
    .attr('data-adsbygoogle-status',null)
    .attr('data-ad-format',window.innerWidth < 480 ? 'auto':'rectangle')
    .html(null);
    (adsbygoogle = window.adsbygoogle || []).push({});
  },200);
});


