import YouTube from 'youtube-node';
import util from 'util';

const yt = new YouTube();
yt.setKey(process.env.YOUTUBE_API_KEY);

const youtube = {
    search:util.promisify(yt.search.bind(yt)),
    getById:util.promisify(yt.getById.bind(yt)),
    related:util.promisify(yt.related.bind(yt))
};

(async ()=>{
  console.log(JSON.stringify(await youtube.getById('IzR3vllw6O0'),null,1));
})();
