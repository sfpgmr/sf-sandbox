import os from 'os';
import path from 'path';
import resolveHome from './resolveHome.mjs';
import fs from 'fs';

const projectBase = resolveHome('~/pj/sandbox/new-site/');
const srcBase = path.join(projectBase , 'src');
const dataBase = path.join(projectBase ,'data');

export const siteConfig = {
  dbPath:path.join(dataBase,'db','contents.db'),
  contentsDirs:[
    {
      blog:true,
      path:path.join(dataBase,'blog/contents')
    },
    {
      blog:false,
      path:path.join(dataBase,'contents')
    }
  ]
};

export const blogConfig = {
  srcJsDir: './src/blog/js/',
  srcNodeDir: './src/node/',
  srcEjsDir: './src/blog/ejs/',
  srcCssDir: './src/blog/css/',
  destCssDir:'./src/blog/ejs/amp/',
  destBasePath: resolveHome('~/www/blog/contents'),
  destRepoDir: resolveHome('~/www/blog'),
  destEjsDir: resolveHome('~/www/blog/contents/'),
  wwwRootDir: resolveHome('~/www/html/contents/'),
  archiveDir:'archive/',
  archiveCategoryDir:'archive/category/',
  mdDir: './data/blog/contents/',
  mdRepoDir: './data',
  //mdDir: './data/blog/test/',
  cacheDir: './data/blog/temp/cache/',
  imageCacheDir: 'image/',
  repoMdDir: 'blog/contents/',
  //repoMdDir: 'blog/contents/',
  entriesPath: './data/blog/entries.json',
  //entriesPath: './data/blog/entries-test.json',
  siteUrl: 'https://sfpgmr.net/',
  alterUrl: 'https://alter.sfpgmr.net/',
  siteDomain: 'sfpgmr\.net',
  siteBlogRoot: 'blog/',
  siteContentPath: 'entry/',
  siteAtomDir:'feed/',
  ampDir:'amp/',
  contentRoot:'contents/',
  pushAutomatic:true,
  author:'SFPGMR',
  authorLink:'https://sfpgmr.net/profile.html#sfpgmr',
  websitePath:'./json-ld/wwwsite.json',
  'json-ld':{
    '@context': {
      '@vocab': 'http://schema.org/',
      '@base': 'https://sfpgmr.net/',
      'sf':'https://www.sfpgmr.net/'
    },
    'sf:blogConfig': {
      'Blog': {
        '@type': 'Blog',
        'url': 'https://sfpgmr.net/blog/',
        '@id':'/#blog',
        'headline': 'S.F. Blog',
        'name': 'S.F. Blog',
        'about': 'IT技術や音楽に関する制作物の公開、情報発信を行っています。',
        'keywords': 'Programming,Music,C++,DirectX,HTML5,WebGL,javascript,WebAudio',
        'author': {
          '@type': 'Person',
          '@id': '/profile.html#sfpgmr',
          'name': 'Satoshi Fujiwara',
          'image': {
            '@type': 'ImageObject',
            'url': 'https://sfpgmr.net/img/sfpgmr.png',
            'width':'1200',
            'height':'1200'
          },
          'alternateName': 'SFPGMR'
        },
        'publisher': {
          '@type': 'Organization',
          '@id':'/#organization',
          'name': 'SFPGMR',
          'logo':{
            '@type': 'ImageObject',
            'url': 'https://sfpgmr.net/img/sfpgmr.png',
            'width':'1200',
            'height':'1200'
          }
        },
        "isPartOf":{"@id":"/#website"}
      },
      'sf:templates': {
        'sf:pageTemplate': '',
        'sf:listTemplate': ''
      },
      'sf:copylight':'All rights reserved 2017, Satoshi Fujiwara',
      'sf:stylesheet':'',
      'sf:blogPostingDefaults': {
        '@type': 'BlogPosting',
        '@id': '',
        'url': '',
        'keywords': '',
        'about': '',
        'author': {
          '@id': '/profile.html#sfpgmr'
        },
        'image': [
          'https://sfpgmr.net/img/sfblog.1x1.png',
          'https://sfpgmr.net/img/sfblog.4x3.png',
          'https://sfpgmr.net/img/sfblog.16x9.png'
        ],
        'publisher': {
          '@type': 'Organization',
          '@id':'/#organization',
          'name': 'SFPGMR',
          'logo':{
            '@type': 'ImageObject',
            'url': 'https://sfpgmr.net/img/sfpgmr.png',
            'width':'1200',
            'height':'1200'
          }
        },
        "isPartOf":{"@id":"/#blog"}
      }
    }
  },
};

export default blogConfig;
