
import tw from 'twitter';
import util from 'util';
import sqlite from 'sqlite';
import request from 'request-promise-native';
import fs from 'fs';
import YouTube from 'youtube-node';
import jsdom from 'jsdom';
import puppeteer from 'puppeteer';
const { JSDOM } = jsdom;

process.setMaxListeners(Infinity); // <== Important line

const yt = new YouTube();
yt.setKey(process.env.YOUTUBE_API_KEY);

const youtube = {
  search: util.promisify(yt.search.bind(yt)),
  getById: util.promisify(yt.getById.bind(yt)),
  related: util.promisify(yt.related.bind(yt))
};

// ツイートにエンベッドコンテンツの情報を付与する（主にYouTube）
async function makeEmbededInfo(tweet) {
  const browser = await puppeteer.launch();
  if (tweet.entities.urls) {
    const urls = tweet.entities.urls;
    for (const url of urls) {
      const m = (/youtu\.?be\/([^\/]+)$/i).exec(url.display_url);
      if (m) {
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

          page.on('console', msg => {
            if (msg.type() == 'log') {
              console.log(msg.text());
            }
          });

          const meta = await page.evaluate(() => {
            function isObject(o) {
              return (o instanceof Object && !(o instanceof Array)) ? true : false;
            }
            // meta description
            let description = document.querySelector('meta[name = "description"]') || document.querySelector('meta[name = "Description"]');
            description = description ? description.textContent : undefined;

            // meta keywords
            let keywords = document.querySelector('meta[name="keywords"]') || document.querySelector('meta[name="Keywords"]');
            keywords = keywords ? keywords.textContent : undefined;

            // meta author
            let author = document.querySelector('meta[name="author"]') || document.querySelector('meta[name="Author"]') || undefined;
            author = author ? author.textContent : undefined;


            let twitterMeta = document.querySelectorAll('meta[name ^= "twitter:"]'), twitter;

            // twitter-card
            if (twitterMeta) {
              twitter = {};
              for (const tm of twitterMeta) {
                let tm_ns = tm.name.split(':').slice(1);
                if (tm_ns.length > 1) {
                  tm_ns.reduce((p, v, i, a) => {
                    //console.log(`@twitter-prop@:${tm.name} ${p} ${v}`);
                    if (isObject(p)) {
                      if (!(v in p)) {
                        if (i == (a.length - 1)) {
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
                  }, twitter);
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
            if (ogps) {
              try {
                og = {};
                for (const o of ogps) {
                  let og_ns = o.getAttribute('property').split(':').slice(1);
                  if (og_ns.length > 1) {
                    og_ns.reduce((p, v, i, a) => {
                      //console.log(`@og-prop@:${o.getAttribute('property')} ${p} ${v}`);
                      if (isObject(p)) {
                        if (!(v in p)) {
                          if (i == (a.length - 1)) {
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
                    }, og);
                  } else {
                    //console.log(`@og-prop@:${og_ns[0]} ${o.content}`);
                    og[og_ns[0]] = o.content;
                  }
                }
              } catch (e) {
                console.log(e);
              }

            } else {
              og = undefined;
            }

            // json-ld
            let json_ld_tags = document.querySelectorAll('script[type="application/ld+json"]'), json_lds;
            if (json_ld_tags) {
              json_lds = [];
              for (const j of json_ld_tags) {
                try {
                  //console.log(j.textContent);
                  const json = JSON.parse(j.textContent);
                  json_lds.push(json);
                } catch (e) {
                  console.log(e);
                }
              }
            } else {
              json_lds = undefined;
            }

            // icon image
            let icons = document.querySelectorAll('link[rel = "icon"]');
            if (icons.length) {
              const ti = [];
              icons.forEach(icon => {
                ti.push({
                  url: icon.getAttribute('href'),
                  sizes: icon.getAttribute('sizes') || undefined
                });
              });
              icons = ti;
            } else {
              icons = undefined;
            }

            let appleIcon = document.querySelector('link[rel ^="apple-touch-icon"]');

            if (appleIcon) {
              appleIcon = {
                url: appleIcon.getAttribute('href')
              }
            } else {
              appleIcon = undefined;
            }

            let msapplicationTileImage = document.querySelector('meta[name ^= "msapplication-TileImage"]');
            if (msapplicationTileImage) {
              msapplicationTileImage = {
                url: msapplicationTileImage.getAttribute('content')
              }
            } else {
              msapplicationTileImage = undefined;
            }

            // json oembed

            let jsonOembed = document.querySelector('link[type ^= "application/json+oembed"]');
            if (jsonOembed) {
              jsonOembed = jsonOembed.getAttribute('href');
              if (!jsonOembed.match(/^http/i)) {
                jsonOembed = location.origin + jsonOembed;
              }
            } else {
              jsonOembed = undefined;
            }
            return {
              title: document.title ? document.title : undefined,
              description: description,
              keywords: keywords,
              author: author,
              twitter: twitter,
              og: og,
              json_lds: json_lds,
              icons: {
                icons: icons,
                appleIcon: appleIcon,
                msapplicationTileImage: msapplicationTileImage
              },
              jsonOembed: jsonOembed
            }
          });


          // const {window} = await JSDOM.fromURL(url.expanded_url);
          // const {document} = window;
          // let description = document.querySelector('meta[name =  "description"]').content;
          // description = description ? description.content : '';
          // let title = document.querySelector('title').textContent
          // console.log(title,description);
          //url.ogp = ogp;
          if (meta.jsonOembed) {
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
  await browser.close();
  return tweet;
}

export default class Twitter {
  constructor() {
    this.initPromiss = this.init();
  }

  async init() {
    this.client = new tw({
      consumer_key: process.env.TWCKEY,
      consumer_secret: process.env.TWCSECRET,
      access_token_key: process.env.TWAKEY,
      access_token_secret: process.env.TWASECRET
    });
    this.pastMs = 1000 * 3600 * 24 * 7; // 1 week
    this.getTweet_ = (util.promisify(this.client.get)).bind(this.client);
    this.db = await sqlite.open("./data/tweets.db");
  }

  async dispose() {
    await this.db.close();
  }

  async getTweetThread(statusId) {
    const currentTime = (new Date()).getTime();
    const db = this.db;
    const pastMs = this.pastMs;
    const getTweet_ = this.getTweet_;

    await this.db.run("create table if not exists tweets (id text primary key ,value json,created int,updated int);");
    //await db.run("create table if not exists tweets (id int primary key ,value json,create_date int,update_date int);");

    let tweetData = [];
    const tweetStmt = await db.prepare('select * from tweets where id = ?');
    const tweetReplaceStmt = await db.prepare('replace into tweets(id,value,created,updated) values(?,?,?,?);');


    // ツィートを取得する
    // dbにあれば取得し、なければAPIでデータを取得しDBに格納する
    // dbのデータは7日間以上経過していれば再取得する
    async function getTweet(id) {

      let tweet = await tweetStmt.get(id);
      let dbExists = !!tweet;

      if (!dbExists) {
        tweet = await getTweet_('statuses/show', { id: id });
        tweet = await makeEmbededInfo(tweet);
      } else {
        const dbCreatedTime = tweet.created;
        //console.log(currentTime - dbCreatedTime, pastMs);
        if ((currentTime - dbCreatedTime) > pastMs) {
          // DBのキャッシュが古ければ再取得する
          tweet = await getTweet_('statuses/show', { id: id });
          tweet = await makeEmbededInfo(tweet);
          dbExists = false;
        } else {
          tweet = JSON.parse(tweet.value);
        }
      }
      return { tweet: tweet, dbExists: dbExists };
    }

    let { tweet, dbExists } = await getTweet(statusId);

    while (true) {

      tweetData.push(tweet);
      const date = (new Date()).getTime();

      if (!dbExists) {
        await tweetReplaceStmt.run([tweet.id_str, JSON.stringify(tweet), date, date]);
      }

      //console.log(tweet.id_str,tweet.in_reply_to_status_id_str);

      if (tweet.in_reply_to_status_id_str) {
        const id = tweet.in_reply_to_status_id_str;
        ({ tweet, dbExists } = await getTweet(id));
        if (!tweet) {
          break;
        }
      } else {
        break;
      }
    }

    tweetData.sort((a, b) => {
      const ad = Date.parse(a.created_at);
      const bd = Date.parse(b.created_at);
      if (ad < bd) {
        return -1;
      }
      if (ad > bd) {
        return 1;
      }
      return 0;
    });

    tweetStmt.finalize();
    tweetReplaceStmt.finalize();
    //console.log(tweetData);
    return tweetData;
  }
}
