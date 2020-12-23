import {Organization} from './organization.mjs';
import {Person} from './person.mjs';

export const BlogPosting =  {
  '@type': 'BlogPosting',
  '@id': '',
  'url': '',
  'keywords': '',
  'about': '',
  'author': Person,
  'image': [
    'https://sfpgmr.net/img/sfblog.1x1.png',
    'https://sfpgmr.net/img/sfblog.4x3.png',
    'https://sfpgmr.net/img/sfblog.16x9.png'
  ],
  'publisher': Organization,
  "isPartOf":{"@id":"/#blog"}
};
