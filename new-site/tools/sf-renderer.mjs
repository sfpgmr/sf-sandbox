import { Renderer } from './marked.mjs';
import htmlEncode from 'js-htmlencode';
import apac from 'apac';
const { OperationHelper } = apac;
import mjApi from 'mathjax-node';
mjApi.start();
import { URL } from 'url';
import util from 'util';
import { parseAttributes } from './sf-util.mjs';
import { blogConfig as config } from './config-blog.mjs';
import request from 'request-promise-native';
import sizeOf from 'image-size';
import fs from 'fs-extra';
import hljs from 'highlight.js';
import path from 'path';
import { escape, unescape } from './marked.mjs';
import resolveHome from './resolveHome.mjs';
import Twitter from './twitter.mjs';
//import {JSDOM} from 'jsdom';

let twitter_;

const amazonCachePath = '../data/db/amazon-cache.json';
const imgCachePath = '../data/db/img-cache.json';

// tex描画エンジン

function texRenderer(tex) {
  tex = tex.replace(/\\([\[\]])/ig, '$1');

  return new Promise((resolve, reject) => {
    mjApi.typeset({
      math: tex,
      format: 'TeX',
      svg: true
    }, (data) => {
      if (data.errors) reject(new Error(data.errors.join('\n')));
      //console.log(data.svg);
      console.log(`****mathjax**** tex:"${tex}" svg:"${data.svg}"`);
      resolve(data.svg);
    });
  });
}

// function texRenderer(tex){
//   return new Promise((resolve,reject)=>{
//     try {
//       let res = katex.renderToString(tex);
//       console.log('####katex####');
//       console.log(tex);
//       console.log(res);
//       resolve(res);
//     } catch (e) {
//       reject(e);
//     }
//   });
// }

let amazonCache;
try {
  let s = fs.statSync(amazonCachePath);

  if (s.isFile) {
    amazonCache = new Map(JSON.parse(fs.readFileSync(amazonCachePath, 'utf-8')));
  }
} catch (e) {
  amazonCache = new Map();
}

let imgCache;
// イメージのキャッシュ
try {
  let s = fs.statSync(imgCachePath);

  if (s.isFile) {
    imgCache = new Map(JSON.parse(fs.readFileSync(imgCachePath, 'utf-8')));
  }
} catch (e) {
  imgCache = new Map();
}

export async function saveCache() {
  await fs.writeFile(imgCachePath, JSON.stringify([...imgCache]), 'utf-8');
  await fs.writeFile(amazonCachePath, JSON.stringify([...amazonCache]), 'utf-8');
}

export function closeResources() {
  twitter.dispose();
}

const amazonIds = JSON.parse(fs.readFileSync(resolveHome('~/www/node/keys/wwwmaker/amazon.json')));
const opHelper = new OperationHelper({
  awsId: amazonIds.AWSID,
  awsSecret: amazonIds.AWSSECRET,
  assocId: amazonIds.ASSOCID,
  locale: 'JP'
});


const adsenseIds = JSON.parse(fs.readFileSync(resolveHome('~/www/node/keys/wwwmaker/adsense.json')));

const infeedAd = `
<ins class="adsbygoogle"
     style="display:block; text-align:center;"
     data-ad-format="fluid"
     data-ad-layout="in-article"
     data-ad-client="${adsenseIds['data-ad-client']}"
     data-ad-slot="${adsenseIds['data-ad-slots'][0]}"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script>
`;

const ampAd = `
<amp-ad
layout="fixed-height"
height=100
type="adsense"
data-ad-client="${adsenseIds['data-ad-client']}"
data-ad-slot="${adsenseIds['data-ad-slots'][1]}"
>
</amp-ad>
`;

const noimage = `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
<g>
 <text xml:space="preserve" text-anchor="start" font-family="Helvetica, Arial, sans-serif" font-size="24" y="24.250077" x="16.125168" stroke-width="0" stroke="#000" fill="#000000">No</text>
 <text stroke="#000" transform="matrix(0.947516918182373,0,0,0.8971372246742247,2.4155090525746346,5.041590690612793) " xml:space="preserve" text-anchor="start" font-family="Helvetica, Arial, sans-serif" font-size="24" y="53.749771" x="-1.624648" stroke-width="0" fill="#000000">Image</text>
</g>
</svg>
`;

async function doAmazonContents(asin, p1, p2, amp = false) {
  let resp = null;
  let retry = 10;
  const imgTag = amp ? 'amp-img' : 'img';

  let item;

  if (!amazonCache.has(asin)) {
    while (retry && !resp) {
      try {
        resp = await opHelper.execute('ItemLookup', {
          Condition: 'All',
          ResponseGroup: 'Medium',
          ItemId: asin
        });
      } catch (e) {
        await new Promise((resolve, reject) => {
          setTimeout(() => resolve(), 1000);
        });
        --retry;
        if (!retry) throw e;
      }
      if (!resp.result.ItemLookupResponse) {
        resp = null;
        --retry;
        if (!retry) throw new Error('API呼び出しに失敗');
        await new Promise((resolve, reject) => {
          setTimeout(() => resolve(), 1000);
        });
      }
    }
    item = resp.result.ItemLookupResponse.Items.Item;
    amazonCache.set(asin, item);
  } else {
    item = amazonCache.get(asin);
  }

  console.log('****amazon***', item.DetailPageURL);

  let content = '';
  switch (p1) {
    case 'image':
      switch (p2) {
        case 'large':
          content =
            `<aside class="amazon-image"><a href="${item.DetailPageURL}" target="_blank" title="amazon詳細ページへ"><${imgTag} src="${item.LargeImage.URL}" alt="${htmlEncode(item.ItemAttributes.Title)}"  width="${item.LargeImage.Width._}" height="${item.LargeImage.Height._}" ></${imgTag}></a></aside>`;
          break;
        case 'small':
          content =
            `<aside class="amazon-image"><a href="${item.DetailPageURL}" target="_blank" title="amazon詳細ページへ"><${imgTag} src="${item.SmallImage.URL}" alt="${htmlEncode(item.ItemAttributes.Title)}"  width="${item.SmallImage.Width._}" height="${item.SmallImage.Height._}"></${imgTag}></a></aside>`;
          break;
        default:
          content =
            `<aside class="amazon-image"><a href="${item.DetailPageURL}" target="_blank" title="amazon詳細ページへ"><${imgTag} src="${item.LargeImage.URL}" alt="${htmlEncode(item.ItemAttributes.Title)}"  width="${item.LargeImage.Width._}" height="${item.LargeImage.Height._}"></${imgTag}></a></aside>`;
          break;
      }
      break;
    default:
      content =
        `<aside class="amazon">
<div class="amazon-detail-svglogo">
<svg viewBox="0 0 120 110" xmlns="http://www.w3.org/2000/svg">
<g>
 <path d="m6.18912,81.36173c0.3151,-0.50417 0.81927,-0.53575 1.51261,-0.09454c15.75631,9.13873 32.8993,13.70804 51.42879,13.70804c12.35293,0 24.54836,-2.3004 36.58629,-6.90129c0.3151,-0.12602 0.772,-0.3151 1.3708,-0.56723c0.59871,-0.25213 1.02413,-0.44121 1.27627,-0.56723c0.94538,-0.37815 1.6859,-0.18908 2.22165,0.56723c0.53565,0.75631 0.36237,1.44955 -0.51996,2.07984c-1.13446,0.81936 -2.58411,1.76475 -4.34876,2.83615c-5.42025,3.2143 -11.4707,5.70377 -18.15134,7.46852c-6.68073,1.76475 -13.20387,2.64707 -19.56941,2.64707c-9.83198,0 -19.1283,-1.71748 -27.88878,-5.15233c-8.76057,-3.43486 -16.60725,-8.27209 -23.54002,-14.51162c-0.37815,-0.3151 -0.56723,-0.63029 -0.56723,-0.94538c0,-0.18908 0.06296,-0.37815 0.18908,-0.56723zm28.45601,-26.94339c0,-4.34876 1.0714,-8.06723 3.2143,-11.15551c2.1428,-3.08828 5.07349,-5.42016 8.79205,-6.99583c3.40338,-1.44955 7.59454,-2.48948 12.57358,-3.11976c1.70169,-0.18908 4.47478,-0.44121 8.31936,-0.75631l0,-1.60715c0,-4.03366 -0.44121,-6.7437 -1.32354,-8.13029c-1.32354,-1.89076 -3.40338,-2.83615 -6.23952,-2.83615l-0.75631,0c-2.07984,0.18908 -3.87607,0.85084 -5.38868,1.9853s-2.48957,2.71013 -2.93068,4.72691c-0.25213,1.26048 -0.88242,1.9853 -1.89076,2.17438l-10.8719,-1.32354c-1.0715,-0.25213 -1.60715,-0.81936 -1.60715,-1.70169c0,-0.18908 0.03148,-0.40963 0.09454,-0.66177c1.0714,-5.60924 3.70268,-9.76892 7.89394,-12.47905c4.19116,-2.71013 9.09136,-4.22274 14.70069,-4.53783l2.36346,0c7.18491,0 12.79414,1.85928 16.8278,5.57776a18.01142,18.01142 0 0 1 1.74896,2.03257c0.53565,0.72482 0.96108,1.3708 1.27627,1.93803c0.3151,0.56723 0.59871,1.38659 0.85084,2.45799c0.25204,1.0714 0.44112,1.81201 0.56723,2.22165c0.12602,0.40963 0.22056,1.29205 0.28361,2.64707c0.06296,1.35502 0.09454,2.15859 0.09454,2.41072l0,22.87825c0,1.63863 0.23635,3.13555 0.70904,4.49057s0.92959,2.33197 1.3708,2.93068c0.44112,0.59871 1.16594,1.55988 2.17438,2.88342c0.37815,0.56723 0.56723,1.0714 0.56723,1.51261c0,0.50417 -0.25213,0.94538 -0.75631,1.32354c-5.23118,4.53783 -8.06732,6.99583 -8.50844,7.37398c-0.75631,0.56723 -1.67021,0.63029 -2.74161,0.18908c-0.88242,-0.75631 -1.65442,-1.48113 -2.31619,-2.17438s-1.13446,-1.19752 -1.41807,-1.51261s-0.74061,-0.92959 -1.3708,-1.8435c-0.63029,-0.9139 -1.0715,-1.5284 -1.32354,-1.8435c-3.52949,3.84459 -6.99583,6.23952 -10.3992,7.18491c-2.1429,0.63029 -4.78997,0.94538 -7.94121,0.94538c-4.85303,0 -8.83932,-1.49682 -11.95909,-4.49057s-4.67964,-7.23217 -4.67964,-12.71539zm16.26057,-1.89076c0,2.45799 0.6145,4.42751 1.8435,5.90864s2.88342,2.22165 4.96326,2.22165c0.18908,0 0.4569,-0.03148 0.80357,-0.09454c0.34658,-0.06306 0.58292,-0.09454 0.70904,-0.09454c2.64707,-0.69325 4.69534,-2.39494 6.14498,-5.10506c0.69325,-1.19752 1.21321,-2.50526 1.55988,-3.92334c0.34658,-1.41807 0.53565,-2.56832 0.56723,-3.45065c0.03148,-0.88233 0.04727,-2.33197 0.04727,-4.34876l0,-2.36346c-3.65551,0 -6.4286,0.25213 -8.31936,0.75631c-5.54627,1.57567 -8.31936,5.07358 -8.31936,10.49374zm39.70605,30.44131c0.12602,-0.25213 0.3151,-0.50417 0.56723,-0.75631c1.57557,-1.0714 3.08819,-1.79623 4.53783,-2.17438c2.39494,-0.63029 4.72691,-0.97686 6.99583,-1.03992c0.63019,-0.06306 1.229,-0.03148 1.79623,0.09454c2.83615,0.25213 4.53783,0.72482 5.10506,1.41807c0.25204,0.37815 0.37815,0.94538 0.37815,1.70169l0,0.66177c0,2.20586 -0.59881,4.80566 -1.79623,7.7994c-1.19752,2.99374 -2.86772,5.40447 -5.01053,7.23217c-0.31519,0.25213 -0.59881,0.37815 -0.85084,0.37815c-0.12611,0 -0.25213,-0.03148 -0.37815,-0.09454c-0.37815,-0.18908 -0.47269,-0.53575 -0.28361,-1.03992c2.33188,-5.48322 3.49791,-9.29623 3.49791,-11.43913c0,-0.69325 -0.12611,-1.19752 -0.37815,-1.51261c-0.63029,-0.75631 -2.39503,-1.13446 -5.29414,-1.13446c-1.0715,0 -2.33197,0.06306 -3.78153,0.18908c-1.57567,0.18908 -3.02522,0.37815 -4.34876,0.56723c-0.37815,0 -0.63029,-0.06306 -0.75631,-0.18908c-0.12611,-0.12602 -0.1576,-0.25213 -0.09454,-0.37815c0,-0.06306 0.03148,-0.1576 0.09454,-0.28361z"/>
</g>
</svg>
</div>
<div class="amazon-detail-image">
<a href="${item.DetailPageURL}" target="_blank" title="amazon詳細ページへ">`
        + (item.SmallImage ?
          `<${imgTag} src="${item.SmallImage.URL}" alt="${htmlEncode(item.ItemAttributes.Title) || 'タイトルなし'}" width="${item.SmallImage.Width._}" height="${item.SmallImage.Height._}" ></${imgTag}>` : noimage)
        +
        `</a>
</div>
<div class="amazon-detail">
<div class="amazon-title">
<a href="${item.DetailPageURL}" target="_blank" title="amazon詳細ページへ"><span class="amazon-logo"></span>${htmlEncode(item.ItemAttributes.Title || 'タイトルなし')}</a>
</div>
<div>作者:${htmlEncode(item.ItemAttributes.Publisher || '不明')}</div>
</div>
</aside>
`;
      break;
  }
  return content;
}


/////////////////////////////////////
// Normal Renderer
/////////////////////////////////////
export class NormalRenderer extends Renderer {
  constructor(options) {
    super(options);
  }

  async custom(text, command, param) {
    const amp = false;
    console.log(text, command, param);
    switch (command) {
      case 'asin':
        const params = param.split(':');
        return doAmazonContents(params[0], params[1], params[2]);
      case 'adsense':
        return infeedAd;
      case 'codeWithIframe':
        {
          // まずJSON形式なのか確認
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { srcPath:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            return codeWithIframe({ srcPath: paramjson, amp: amp });
          }
          return codeWithIframe(paramjson);
        }
      case "iframe":
        {
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { srcPath:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            return iframe_({ srcPath: paramjson, amp: amp });
          }
          return iframe_(paramjson);
        }
      case "twitter":
        {
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { status:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            paramjson = { status: paramjson, amp: amp };
          } else {
            paramjson.amp = amp;
          }
          return twitter(paramjson);
        }
      case "twitter-thread":
        {
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { status:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            paramjson = { status: paramjson, amp: amp };
          } else {
            paramjson.amp = amp;
          }
          return await twitterThread(paramjson);
        }
      case "gist":
        {
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch(e) {
            paramjson = { id: param, amp: amp };
          }
          if ((typeof paramjson) != 'object') {
            paramjson = { id: paramjson, amp: amp };
          } else {
            paramjson.amp = amp;
          }
          return gist(paramjson);
      }

    }
    return text;
  }

  async tex(text) {
    return texRenderer(text);
  }
}

/////////////////////////////////////
// AMP HTML用レンダラー
/////////////////////////////////////
export class AmpRenderer extends Renderer {
  constructor(options) {
    super(options);
    const url = new URL(config.siteUrl);
    this.scheme = url.protocol;

  }

  saveCache() {
    return
  }

  async html(html) {
    // iframeの検出
    //let iframe = /<iframe( +\w*(?:=["']?.*?["']?)?)*\/?>(?:<\/iframe>)?/ig;
    let iframe = /<iframe\s?([^>]*?)\/?>(?:<\/iframe>)?/ig;
    let object = /<object\s?([^>]*?)\/?>.*(?:<\/object>)/igm;
    let img = /<img\s?([^>]*?)\/?>(?:<\/img>)?/ig;
    let m = null;

    // let fragment = JSDOM.fragment(html);
    // let doc = new JSDOM('');
    // let imgs = fragment.querySelectorAll('img');
    
  
    // for(const img of imgs){
    //   img.parentElement.appendChild()
    //   img.parentElement.removeChild(img);
    // }

    while ((m = img.exec(html))) {
      let attribs = parseAttributes(m[1]);
      if (attribs['src'].match(/i\.[^\.]*\.microsoft\.com/)) {
        attribs['src'] = attribs['src'].replace(/i\.([^\.]*)\.microsoft\.com/, '$1.microsoft.com');
      }
      let ampImgStr = await this.image(attribs['src'], attribs['title'], attribs['alt'],attribs);
      html = html.replace(m[0], ampImgStr);
    }

    html = html.replace(iframe, (m, m1) => {
      let attribs = parseAttributes(m1);
      if (/youtube/.test(attribs.src)) {
        // YouTube
        let url = new URL(attribs.src, 'https://www.youtube.com');
        let id = (/([^/]+?)?$/.exec(url.pathname))[1];
        if (id) {
          return `<amp-youtube data-videoid="${id}" data-param-videoId="${id}" layout="responsive" width="${attribs.width}" height="${attribs.height}"></amp-youtube>`;
        }
      }
      attribs.width = (!attribs.width || /%/.test(attribs.width)) ? 1024 : attribs.width;
      attribs.height = (!attribs.height || /%/.test(attribs.height)) ? 768 : attribs.height;
      //return `<amp-iframe src="${attribs.src}" width="${attribs.width}" height="${attribs.height}" ${attribs.frameboarder?'frameboarder="' + attribs.frameboarder + '"':''} ${attribs.allowfullscreen?'allowfullscreen':''} sandbox="allow-scripts allow-same-origin allow-presentation" layout="responsive"><amp-img layout="fill" src="/img/iframe-ph.svg" placeholder></amp-img></amp-iframe>`;

      //return `<amp-iframe src="${attribs.src}" width="${attribs.width}" height="${attribs.height}" ${attribs.frameboarder ? 'frameboarder="' + attribs.frameboarder + '"' : ''} ${attribs.allowfullscreen ? 'allowfullscreen' : ''} sandbox="allow-scripts allow-presentation" layout="responsive"><amp-img layout="fill" src="/img/iframe-ph.svg" placeholder></amp-img></amp-iframe>`;
      return `<amp-iframe src="${attribs.src}" width="${attribs.width}" height="${attribs.height}" ${attribs.allowfullscreen ? 'allowfullscreen' : ''} sandbox="allow-scripts allow-presentation" layout="responsive"><amp-img layout="fill" src="/img/iframe-ph.svg" placeholder></amp-img></amp-iframe>`;    });

    html = html.replace(/embed-responsive-?(?:4by3|16by9)?/ig, '');
    return html;
  }

  async image(href, title, text,attribs) {
    console.log('****image****', href);
    // amp-image対応
    let out = `<amp-img src="${href}" alt="${text}"`;
    if (title) {
      out += ` title="${title}"`;
    }

    // width,heightの算出
    
    if (/^\//.test(href)) {
      href = new URL(href, config.siteUrl);
    }

    try {
     
      let imgObj;
      let size;
      if(attribs && attribs.width && attribs.height){
        size = {width:attribs.width,height:attribs.height};
      } else if (imgCache.has(href)) {
        size = imgCache.get(href);
        if(size.error){
          imgObj = await request({ uri: href, encoding: null,'rejectUnauthorized': false });
          size = await sizeOf(imgObj);
          console.log(size);
          imgCache.set(href, { width: size.width, height: size.height });
        }
      } else {
        imgObj = await request({ uri: href, encoding: null,'rejectUnauthorized': false });
        size = await sizeOf(imgObj);
        imgCache.set(href, { width: size.width, height: size.height });
      }
      out += ` width="${size.width}" height="${size.height}" layout="responsive">`;
    } catch (e) {
      console.log('**** failed ****',e)
      out += ' width="100" height="100" layout="responsive">';
      imgCache.set(href, { width: 100, height: 100, error: e.code || true });
    }
    //const cacheDir = config.cacheDir + config.imageCacheDir;
    out += '</amp-img>';
    return out;
  }

  async paragraph(text) {
    //console.log('<<<text\n' + text + '\n>>>text');
    return '<p>' + await this.html(text) + '</p>\n';
  }

  async tex(text) {
    let svg = await texRenderer(text);
    svg =
      svg
        .replace(/style=[`"]?[^`"]*[`"]?/ig, '')
        .replace(/focusable=[`"]?[^'"]*[`"]?/ig, '');
    return svg;
  }

  async custom(text, command, param) {
    const amp = true;
    console.log(text, command, param);
    switch (command) {
      case 'asin':
        const params = param.split(':');
        return doAmazonContents(params[0], params[1], params[2], true);
      case 'adsense':
        return ampAd;
      case 'codeWithIframe':
        {
          // まずJSON形式なのか確認
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { srcPath:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            return codeWithIframe({ srcPath: paramjson, amp: amp });
          }
          return codeWithIframe(paramjson);
        }
      case "iframe":
        {
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { srcPath:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            return iframe_({ srcPath: paramjson, amp: amp });
          }
          return iframe_(paramjson);
        }
      case "twitter":
        {// まずJSON形式なのか確認
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { status:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            paramjson = { status: paramjson, amp: amp };
          } else {
            paramjson.amp = amp;
          }
          return twitter(paramjson);
        }
      case "twitter-thread":
        // まずJSON形式なのか確認
        {
          let paramjson;
          try {
            paramjson = JSON.parse(param);
          } catch (e) {
            paramjson = { status:param,amp:amp };
          }
          if ((typeof paramjson) != 'object') {
            paramjson = { status: paramjson, amp: amp };
          } else {
            paramjson.amp = amp;
          }
          return await twitterThread(paramjson);
        }
        case "gist":
          {
            let paramjson;
            try {
              paramjson = JSON.parse(param);
            } catch(e) {
              paramjson = { id: param, amp: amp };
            }
            if ((typeof paramjson) != 'object') {
              paramjson = { id: paramjson, amp: amp };
            } else {
              paramjson.amp = amp;
            }
            return gist(paramjson);
          }
        default:
          console.warn(`Warning:${command} does not defined or ${param} is illegal.`);
          return '';
          //throw new Error(`Error:${command} does not defined or ${param} is illegal.`);
      }
  }
}

// gist embed
function gist (opts){
  const {id,amp,height} = opts;
  if(!amp){
    return `<script src="https://gist.github.com/sfpgmr/${id}.js"></script>`;
  } else {
    return `<amp-gist data-gistid="${id}" layout="fixed-height" height="${height?height:480}"></amp-gist>`;
  }
}

// Twitter Cardを挿入する
function twitter(opts) {

  opts["data-lang"] = opts["data-lang"] || 'ja';
  opts["data-conversation"] = opts["data-conversation"] || 'none';

  let attributeOpt = [];
  for (const opt in opts) {
    if (opt.match(/^data-/)) {
      attributeOpt.push(`${opt}="${opts[opt]}"`);
    }
  }

  attributeOpt = attributeOpt.join(' ');

  if (!opts.amp) {
    return `<blockquote class="twitter-tweet" ${attributeOpt} ><a href="https://twitter.com/SFPGMR/status/${opts.status}">tweet</a></blockquote>`;
  } else {
    return `<amp-twitter data-tweetid="${opts.status}" width="800" height="600" layout="responsive" ${attributeOpt}></amp-twitter>`;
  }
}

//カスタムフォーマットでTwitterを表示
function twitterCustom(opts) {
  const amp = opts.amp;
  const lazyLoading = '';
  const tweet = opts.retweeted ? opts.retweeted_status : opts;
  let tweetText = tweet.full_text ? tweet.full_text : tweet.text;
  let embededs = [];
  if (tweet.entities.urls) {
    const urls = tweet.entities.urls;
    for (const url of urls) {
      if (url.youtube) {
        const yt_item = url.youtube.items[0] || url.youtube.items;
        const yt_thumb = yt_item.snippet && yt_item.snippet.thumbnails && (yt_item.snippet.thumbnails.high || yt_item.snippet.thumbnails.medium || yt_item.snippet.thumbnails.standard || yt_item.snippet.thumbnails.default);
        if (yt_thumb) {
          if(!amp){
            tweetText = tweetText.replace(url.url,
              `<iframe class="youtube" type="text/html" src="https://www.youtube.com/embed/${yt_item.id}?autoplay=0&origin=https://sfpgmr.net" width="${yt_thumb.width}" height="${yt_thumb.height}" frameborder="0"></iframe>`
              //`<div class="youtube" data-type="yt" id="${yt_item.id}"><div class="yt-title">Youtube - ${yt_item.snippet.title}</div><svg class="player-play" width="64" height="64" xmlns="http://www.w3.org/2000/svg"><g><path class="player-play-1" fill="#ffffff" stroke-width="1" d="m0,0l64,32l-64,32l0,-64z" /></g></svg><img ${lazyLoading} data-href="${url.expanded_url}" class="youtube" src="${yt_thumb.url}" /></div>`
              );
          } else {
            tweetText = tweetText.replace(url.url,`<amp-youtube data-videoid="${yt_item.id}"  layout="responsive" width="${yt_thumb.width}" height="${yt_thumb.height}"></amp-youtube>`);
          }
        } else {
          tweetText = tweetText.replace(url.url, `<a href="${url.expanded_url}" target="_blank">${url.display_url}</a>`);
        }
      } else if (url.meta) {
        const meta = url.meta;
        const type = meta.twitter ?
          (meta.twitter.card == "summary_large_image" ? "card card-large" : "card card-default")
          : "page";
        const title = meta.title || (meta.json_lds && meta.json_lds && meta.json_lds[0] && meta.json_lds[0].headline) || (meta.twitter && meta.twitter.title) || '';
        // const image = (meta.twitter && meta.twitter.image)  
        //   || (meta.json_lds && ((meta.json_lds[0].image instanceof Array) ? meta.json_lds[0].image[0] : meta.json_lds[0].image));
        // const desc = meta.description || (meta.twitter && meta.twitter.description) || (meta.json_lds && meta.json_lds[0].description);
        const desc = meta.description || (meta.og && meta.og.description) || '';
        console.log(desc);
        let img = (meta.twitter && meta.twitter.image && (meta.twitter.image.src || meta.twitter.image)) || (meta.og && meta.og.image);
        img = img ? `<img ${lazyLoading} src="${img}" />` : '<div class="no-image" >No Image</div>';

        tweetText = tweetText.replace(url.url, `<blockquote class="${type}"><header>${img}<a href="${url.expanded_url}" target="_blank">${title.replace(/</ig, '&lt;').replace(/>/ig, '&gt;')}</a></header><div>${desc.replace(/</ig, '&lt;').replace(/>/ig, '&gt;')}</div></blockquote>`);
      } else {
        tweetText = tweetText.replace(url.url, `<a href="${url.expanded_url}" target="_blank">${url.display_url}</a>`);
      }
    }
  }

  tweetText = tweetText.replace(/\n/ig, '<br/>');
  let rendered = '<section><header class="tweet-header">';
  if (opts.header) {
    rendered += `<img class="tweet-profile-img" src="${tweet.user.profile_image_url_https}" />
      <p class="tweet-user-name">${tweet.user.name}@${tweet.user.screen_name}</p>`;
  }
  rendered += `<p class="tweet-date"><a href="https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}"
    target="_blank">${(new Date(tweet.created_at)).toLocaleString('ja-JP')}</a></p></header>`;

  rendered += `<p class="tweet-text">${tweetText}</p>`;

  const medias = (tweet.extended_entities && tweet.extended_entities.media) || (tweet.entities && tweet.entities.media);
  
  if (medias) {
    if (medias instanceof Array) {
      medias.forEach(m => {
        let v;
        if (m.video_info && m.video_info.variants) {
          v = m.video_info.variants.find(v_ => v_.content_type == "video/mp4");
        }
        if (v && v.url) {
          if(!amp){
            rendered += `<video class="tweet-img" controls src="${v.url}" />`;
          } else {
            const size = m.sizes.large || m.sizes.medium || m.sizes.small || m.sizes.thumb;
            rendered += `
            <amp-video controls width="${size.w}" height="${size.h}" layout="responsive" poster="${media_url_https}" src="${v.url}">
            <div fallback>
              <p>This browser does not support the video element.</p>
            </div>
          </amp-video>`
          }
        } else {
          if(!amp){
            rendered += `<img class="tweet-img" src="${m.media_url_https}" />`
          } else {
            const size = m.sizes.large || m.sizes.medium || m.sizes.small || m.sizes.thumb;
            rendered += `<amp-img alt="image" src="${m.media_url_https}" width="${size.w}" height="${size.h}" layout="responsive">
          </amp-img>`;
          }
        }
      });
    } else {

    }
  }
  rendered += '</section>';
  return rendered;
}

// Twitter Threadを表示する
async function twitterThread(opts) {
  if (!twitter_) {
    twitter_ = new Twitter();
    await twitter_.initPromiss;
  }

  const threads = await twitter_.getTweetThread(opts.status);

  let output = [];
  if (!opts.custom) {
    // Twitter Cardをスレッド分表示
    for (const tweet of threads) {
      output.push(twitter(Object.assign(tweet, opts, { status: tweet.id_str })));
    }
  } else {
    // カスタム フォーマット
    threads.forEach((tweet, index) => {
      if (index == 0) tweet.header = true;
      output.push(twitterCustom(Object.assign(tweet, opts, { status: tweet.id_str })));
    });
    for (const tweet of threads) {
    }
  }
  output = output.join('\n');
  return `<div class="sf-tweet-thread">${output}</div>`;
}



async function codeWithIframe({ srcPath, amp = false, iframe = true, thumbnail, width = 1024, height = 768, srcCode = true, res = true, except = null, sandbox = '' }) {
  // ファイル一覧を作成
  let filePaths = [];
  let index_thumbnail;
  let regpath;

  //if(res){
  regpath = /\.(m?js|html|css|json|jpeg|jpg|a?png|gif|txt|md|bmp)$/;
  //} else {
  //  regpath = /\.(js|html|css|json|txt|md)$/;
  //}

  function listFile(dir) {
    // .mdディレクトリを再帰的に検索する
    let dirs = fs.readdirSync(config.wwwRootDir + dir);
    dirs.forEach(d => {
      let p = path.normalize(config.wwwRootDir + dir + d);
      let stats = fs.statSync(p);
      if (stats.isDirectory()) {
        listFile(dir + d + '/');
      } else if (stats.isFile() && d.match(regpath)) {
        filePaths.push(Object.assign({ filePath: p, wwwpath: dir + d }, path.parse(p)));
      }
      if (stats.isFile() && (/index-thumbnail/i).test(d)) {
        index_thumbnail = dir + d;
      }
    });
  }

  listFile(srcPath);

  if (index_thumbnail && !thumbnail) thumbnail = index_thumbnail;

  let src = '<h4>動作サンプル</h4>';

  src += `<p><a href="${srcPath}" target="_blank">新しいウィンドウで開く</a></p>`;

  if (iframe) {
    src += iframe_({ srcPath: srcPath, amp: amp, width: width, height: height, sandbox });
  } else if (thumbnail) {
    if (!amp) {
      src += `<a href="${srcPath}" target="_blank" title="新しいウィンドウで開きます。">
<img src="${thumbnail}" width="${width}" height="${height}" />
</a>`;
    } else {
      src += `<a href="${srcPath}" target="_blank" title="新しいウィンドウで開きます。"><amp-img src="${thumbnail}" width="${width}" height="${height}" layout="responsive"></amp-image></a>`;
    }
  }

  src += '<h4>ソースコード・リソース</h4>';
  if (except) {
    except = new RegExp(except, 'i');
  }
  for (const filePath of filePaths) {
    src += `<p class="sf-src-url" id="${escape(filePath.base)}"><a href="${filePath.wwwpath}" target="_blank" title="ソースコードを見る">${filePath.wwwpath}</a></p>`;
    if ((/\.(?:jpeg|a?png|gif|bmp|jpg)$/i).test(filePath.ext)) {
      if (res) {
        src += await img({ srcPath: filePath.wwwpath, amp: amp });
      }
    } else {
      if (srcCode && (!except || !except.test(filePath.wwwpath))) {
        let codeSrc = hljs.highlight(filePath.ext.slice(1).replace('mjs', 'js'), await fs.readFile(filePath.filePath, 'utf-8')).value;
        src += `<pre><code class="hljs">${codeSrc}</code></pre>`;
      }
    }
  }
  return src;
}

async function img({ srcPath, amp = false }) {
  let p = srcPath;
  const matches = /^\/(.)/.exec(p);
  let imgObj;
  if (matches) {
    if (matches[1] == '/') {
      p = 'https:' + p;
      const url = new URL(p);
      imgObj = await request({ uri: url, encoding: null,'rejectUnauthorized': false});

    } else {
      p = config.wwwRootDir + p.substr(1);
      imgObj = await fs.readFile(p,null);
    }
  }
  const size = await sizeOf(imgObj);
  const width = size.width, height = size.height;
  if (!amp) {
    return `<img src="${srcPath}" width="${width}" height="${height}" />`;
  } else {
    return `<amp-img src="${srcPath}" width="${width}" height="${height}" layout="responsive"></amp-image>`;
  }
}

function iframe_(opts) {
  let { srcPath, amp = false, width = 1024, height = 768, sandbox = '',layout = 'fixed' } = opts;
  let src = '';
  let matches = /^\/(.)/.exec(srcPath);
  if (matches) {
    if (matches[1] != '/') {
      srcPath = config.alterUrl + srcPath.substr(1);
    } else {
      srcPath = srcPath.replace(/\/\/www\.sfpgmr\.net\//i, config.alterUrl);
    }
  } else {
    srcPath = srcPath.replace(/(?:https?:)?\/\/www\.sfpgmr\.net\//i, config.alterUrl);
  }

  if (amp) {
    src = `<amp-iframe src="${srcPath}" width="${width}" height="${height}" sandbox="allow-scripts allow-presentation ${sandbox}" layout="${layout}"><amp-img layout="fill" src="/img/iframe-ph.svg" placeholder></amp-img></amp-iframe>`;
  } else {
    if(layout == 'responsive'){
      src =  `
      <div class="embed-responsive" style="padding-top:${Math.round(height / width * 10000) / 100}%">
      <iframe src="${srcPath}" frameborder="0" scrolling="no" sandbox="allow-scripts allow-presentation allow-same-origin ${sandbox}"></iframe>
      </div>
      `;
    } else {
      src = `
      <iframe src="${srcPath}" frameborder="0" scrolling="no" width="${width}" height="${height}" sandbox="allow-scripts allow-presentation allow-same-origin ${sandbox}"></iframe>
      `;
    }
  }
  return src;
}


export default {
  NormalRenderer: NormalRenderer,
  AmpRenderer: AmpRenderer,
  saveCache: saveCache
};
