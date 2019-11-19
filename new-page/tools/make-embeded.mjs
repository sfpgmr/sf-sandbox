import request from 'request-promise-native';
import fs from 'fs';
import YouTube from 'youtube-node';
import util from 'util';
import puppeteer from 'puppeteer';
import jsdom from 'jsdom';
const {JSDOM} = jsdom;


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
  const page = await browser.newPage();
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
          console.log(url.url);
          try {

            const p = await page.goto(url.expanded_url);
            const meta = await page.evaluate(()=>{
              let description = document.querySelector('meta[name =  "description"]');
              description = description ? description.content : '';
              let twitterMeta = document.querySelectorAll('meta[name ^= "twitter:"]'),twitter;
              // twitter-card
              if(twitterMeta) {
                twitter = {};
                for(const tm of twitterMeta){
                    let tm_ns = tm.name.split(':').slice(1);
                    if(tm_ns.length > 1){
                      tm_ns.reduce((p,v,i,a)=>{
                        if(!(v in p)){
                          if(i == (a.length - 1)){
                            p[v] = tm.content;
                          } else {
                            p[v] = {};
                          }
                        }
                        return p[v];
                        },twitter);
                    } else {
                      twitter[tm_ns[0]] = tm.content;
                    }
                  }
              }
              // ogp
              let ogps = document.querySelectorAll('meta[name ^= "og:"]');
              let og;
              if(ogps){
                og = {};
                for(const o of ogps){
                  let og_ns = o.name.split(':').slice(1);
                  if(og_ns.length > 1){
                    og_ns.reduce((p,v,i,a)=>{
                      if(!(v in p)){
                        if(i == (a.length - 1)){
                          p[v] = o.content;
                        } else {
                          p[v] = {};
                        }
                      }
                      return p[v];
                    },og);
                  } else {
                    og[og_ns[0]] = o.content;
                  }
                }
              }
              // json-ld
              let json_ld_tags = document.querySelectorAll('script[type="application/ld+json"]'),json_lds;
              if(json_ld_tags){
                json_lds = [];
                for(const j of json_ld_tags){
                  const json =  JSON.parse(j.textContent);
                  json_lds.push(json);
                }
              }


              return  {
                title:document.title,
                description:description,
                twitter:twitter,
                og:og,
                json_lds:json_lds
              }
            });
            // const {window} = await JSDOM.fromURL(url.expanded_url);
            // const {document} = window;
            // let description = document.querySelector('meta[name =  "description"]').content;
            // description = description ? description.content : '';
            // let title = document.querySelector('title').textContent
            // console.log(title,description);
            //url.ogp = ogp;
            url.meta = meta;
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
  await browser.close();
})();
} catch (e) {
  console.log('Error:',e);
}

