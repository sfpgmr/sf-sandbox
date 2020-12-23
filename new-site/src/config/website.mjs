import {copyright} from './copyright.mjs';
import {Person} from './person.mjs';

export const WebSite = {
  "@type": "WebSite",
  '@id': '/#website',
  "url": "https://sfpgmr.net/",
  "headline": "S.F. Web",
  "name": "S.F. Web",
  "description": "IT技術・音楽・ゲームに関する制作物の公開、情報発信を行っています。",
  "keywords": "Programming,Music,Game,HTML5,WebGL,javascript,WebAudio,C++,DirectX",
  "author": Person,
  "copyrightNotice": copyright.copyrightNotice,
  "copyrightHolder": copyright.copyrightHolder
};