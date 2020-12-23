import {Organization} from './organization.mjs';
import {Person} from './person.mjs';

export default Blog = {
  '@type': 'Blog',
  'url': 'https://sfpgmr.net/blog/',
  '@id':'/#blog',
  'headline': 'S.F. Blog',
  'name': 'S.F. Blog',
  'about': 'IT技術や音楽に関する制作物の公開、情報発信を行っています。',
  'keywords': 'Programming,Music,C++,DirectX,HTML5,WebGL,javascript,WebAudio',
  'author': Person,
  'publisher':Organization,
  "isPartOf":{"@id":"/#website"}
};
