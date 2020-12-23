
import {Person} from './person.mjs';
import {Organization} from './organization.mjs';
import {copyright} from './copyright.mjs';
import { WebSite } from './website.mjs';

export const Article = {
  "@type": "Article",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://google.com/article"
  },
  "headline": "",
  "image": [
    "https://example.com/photos/1x1/photo.jpg",
    "https://example.com/photos/4x3/photo.jpg",
    "https://example.com/photos/16x9/photo.jpg"
   ],
  "datePublished": null,
  "dateModified": null,
  "author": Person,
  "publisher": Organization,
  "isPartOf": WebSite,
  "copyrightNotice" : copyright.copyrightNotice,
  "copyrightHolder": copyright.copyrightHolder,
  "creativeWorkStatus": "draft"
};