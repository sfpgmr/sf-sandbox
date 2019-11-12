import request from 'request-promise-native';
import fs from 'fs';
import YouTube from 'youtube-node';
import util from 'util';

const yt = new YouTube();
yt.setKey(process.env.YOUTUBE_API_KEY);

const youtube = {
    search:util.promisify(yt.search.bind(yt)),
    getById:util.promisify(yt.getById.bind(yt)),
    related:util.promisify(yt.related.bind(yt))
};


(async()=>{
  const tweets = JSON.parse(await fs.promises.readFile('./data/tweets.json'));
  for(const tweet of tweets){
    if(tweet.entities.urls){
      const urls = tweet.entities.urls;
      for(const url of urls){
        const m = (/youtu\.?be\/([^\/]+)$/i).exec(url.display_url);
        if(m){
          const id = m[1];
          url.youtube = await youtube.getById(id);
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
})();

