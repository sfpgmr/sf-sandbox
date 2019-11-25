import request from 'request-promise-native';
import fs from 'fs';
import YouTube from 'youtube-node';
import util from 'util';
import puppeteer from 'puppeteer';
import jsdom from 'jsdom';
const {JSDOM} = jsdom;

process.setMaxListeners(Infinity); // <== Important line



try {
const yt = new YouTube();
yt.setKey(process.env.YOUTUBE_API_KEY);

const youtube = {
    search:util.promisify(yt.search.bind(yt)),
    getById:util.promisify(yt.getById.bind(yt)),
    related:util.promisify(yt.related.bind(yt))
};
(async()=>{
  const tweets = JSON.parse(await fs.promises.readFile('./data/tweets.json'));
  const browser = await puppeteer.launch();
  for(const tweet of tweets){
    if(tweet.entities.urls){
      const urls = tweet.entities.urls;
      for(const url of urls){
        const m = (/youtu\.?be\/([^\/]+)$/i).exec(url.display_url);
        if(m){
          try {
            const id = m[1];
            url.youtube = await youtube.getById(id);
          } catch (e) {
            console.log(e);
          }
        } else {

          try {

            const page = await browser.newPage();
            const p = await page.goto(url.expanded_url);
            console.info(url.expanded_url);

            page.on('console', msg => {
              if(msg.type() == 'log'){
                console.log(msg.text());
              }
            });

            const meta = await page.evaluate(()=>{
              function isObject(o){
                return (o instanceof Object && !(o instanceof Array)) ? true : false;
              }
              // meta description
              let description = document.querySelector('meta[name = "description"]') ||  document.querySelector('meta[name = "Description"]')  || undefined;

              // meta keywords
              let keywords = document.querySelector('meta[name="keywords"]') || document.querySelector('meta[name="Keywords"]')  || undefined;

              // meta author
              let author = document.querySelector('meta[name="author"]') || document.querySelector('meta[name="Author"]') || undefined;


              let twitterMeta = document.querySelectorAll('meta[name ^= "twitter:"]'),twitter;

              // twitter-card
              if(twitterMeta) {
                twitter = {};
                for(const tm of twitterMeta){
                    let tm_ns = tm.name.split(':').slice(1);
                    if(tm_ns.length > 1){
                      tm_ns.reduce((p,v,i,a)=>{
                        console.log(`@twitter-prop@:${tm.name} ${p} ${v}`);
                        if(isObject(p)){
                          if(!(v in p)){
                            if(i == (a.length - 1)){
                              p[v] = tm.content;
                            } else {
                              p[v] = {};
                            }
                          }
                        } else {
                          const pp = p;
                          p = {};
                          p[p] = pp;
                          p[v] = {};
                        }
                        return p[v];
                        },twitter);
                    } else {
                      twitter[tm_ns[0]] = tm.content;
                    }
                  }
              } else {
                twitterMeta = undefined;
              }

              // ogp
              let ogps = document.querySelectorAll('meta[property ^= "og:"]');
              let og;
              if(ogps){
                try {
                  og = {};
                for(const o of ogps){
                  let og_ns = o.getAttribute('property').split(':').slice(1);
                  if(og_ns.length > 1){
                    og_ns.reduce((p,v,i,a)=>{
                      console.log(`@og-prop@:${o.getAttribute('property')} ${p} ${v}`);
                      if(isObject(p)){
                        if(!(v in p)){
                          if(i == (a.length - 1)){
                            p[v] = tm.content;
                          } else {
                            p[v] = {};
                          }
                        }
                      } else {
                        const pp = p;
                        p = {};
                        p[p] = pp;
                        p[v] = {};
                      }
                      return p[v];
                    },og);
                  } else {
                    console.log(`@og-prop@:${og_ns[0]} ${o.content}`);
                    og[og_ns[0]] = o.content;
                  }
                }
              } catch(e) {
                console.log(e);
              }
  
              } else {
                ogps = undefined;
              }

              // json-ld
              let json_ld_tags = document.querySelectorAll('script[type="application/ld+json"]'),json_lds;
              if(json_ld_tags){
                json_lds = [];
                for(const j of json_ld_tags){
                  try {
                    console.log(j.textContent);
                    const json =  JSON.parse(j.textContent);
                    json_lds.push(json);
                  } catch (e) {
                    console.log(e);                    
                  }
                }
              } else {
                json_ld_tags = undefined;
              }

              // icon image
              let icons = document.querySelectorAll('link[rel = "icon"]');
              if(icons.length){
                const ti = [];
                icons.forEach(icon=>{ti.push({
                  url:icon.getAttribute('href'),
                  sizes:icon.getAttribute('sizes') || undefined
                });});
                icons = ti;
              } else {
                icons = undefined;
              }

              let appleIcon = document.querySelector('link[rel ^="apple-touch-icon"]');
              
              if(appleIcon){
                appleIcon = {
                  url:appleIcon.getAttribute('href')
                }
              } else {
                appleIcon = undefined;
              }

              let msapplicationTileImage = document.querySelector('meta[name ^= "msapplication-TileImage"]');
              if(msapplicationTileImage){
                msapplicationTileImage = {
                  url:msapplicationTileImage.getAttribute('content')
                }
              } else {
                msapplicationTileImage = undefined;
              }

              // json oembed

              let jsonOembed = document.querySelector('link[type ^= "application/json+oembed"]');
              if(jsonOembed){
                jsonOembed = jsonOembed.getAttribute('href');
                if(!jsonOembed.match(/^http/i)){
                  jsonOembed = location.origin + jsonOembed;
                }
              } else {
                jsonOembed = undefined;
              }
              return  {
                title:document.title ? document.title : undefined,
                description:description ? description : undefined,
                keywords:keywords ? keywords : undefined,
                twitter:twitter,
                og:og,
                json_lds:json_lds,
                icons:{
                  icons:icons,
                  appleIcon:appleIcon,
                  msapplicationTileImage:msapplicationTileImage
                },
                jsonOembed:jsonOembed
              }
            });

            
            // const {window} = await JSDOM.fromURL(url.expanded_url);
            // const {document} = window;
            // let description = document.querySelector('meta[name =  "description"]').content;
            // description = description ? description.content : '';
            // let title = document.querySelector('title').textContent
            // console.log(title,description);
            //url.ogp = ogp;
            if(meta.jsonOembed){
              //console.log(meta.jsonOembed);
              meta.jsonOembed = JSON.parse(await request(meta.jsonOembed));
            }
            url.meta = meta;
            await page.close();
            //console.log(meta);
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
    // const data = await request.get({url:`https://publish.twitter.com/oembed`,
    //   qs:{
    //     url:`https://twitter.com/sfpgmr/status/${tweet.id_str}`,
    //     maxwidth:400,
    //     align:'center',
    //     hide_thread:true,
    //     omit_script:true,
    //     lang:"ja",
    //     dnt:true
    //   },
    //   json:true
    // });
    // tweet.embed = data;
    // 
  }
  await fs.promises.writeFile('./data/tweet2.json',JSON.stringify(tweets,null,1),'utf8');
  //await page.close();
  await browser.close();
})();
} catch (e) {
  console.log('Error:',e);
}

