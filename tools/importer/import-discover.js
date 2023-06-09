/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */
const makeProxySrcs = (main, host) => {
  main.querySelectorAll('img').forEach((img) => {
    if (img.src.startsWith('/')) {
      // make absolute
      const cu = new URL(host);
      img.src = `${cu.origin}${img.src}`;
    }
    try {
      const u = new URL(img.src);
      u.searchParams.append('host', u.origin);
      img.src = `http://localhost:3001${u.pathname}${u.search}`;
    } catch (error) {
      console.warn(`Unable to make proxy src for ${img.src}: ${error.message}`);
    }
  });
};

function buildAuthorPage(document, authorBio, authorLink) {
  const meta = {
    Template: 'author',
  };
  const finalBio = document.createElement('div');

  const image = authorBio.querySelector('.uf-author-avatar > img');
  finalBio.append(image);
  const bio = authorBio.querySelector('.uf-author-bio');

  const sectionBreak = document.createElement('p');
  sectionBreak.innerHTML = '---';
  finalBio.append(sectionBreak);

  meta.Image = image.cloneNode(true);

  const h1 = document.createElement('h1');
  h1.textContent = authorLink.textContent;
  finalBio.append(h1);
  meta.Title = authorLink.textContent;
  const path = authorLink.getAttribute('href').replace('/discover/', '/blogs/');

  const authorLinks = authorBio.querySelector('.uf-author-links');
  const liLink = authorLinks.querySelector('.uf-author-linkedin');
  if (liLink) {
    const socialList = document.createElement('ul');
    const li = document.createElement('li');
    li.append(liLink);
    liLink.textContent = liLink.href;
    socialList.append(li);
    finalBio.append(socialList);
  }

  finalBio.append(bio);

  const metdataCells = [
    ['Section Metadata'],
    ['style', 'author-bio'],
  ];
  const sectionMetadataBlock = WebImporter.DOMUtils.createTable(metdataCells, document);
  finalBio.append(sectionMetadataBlock);

  finalBio.append(sectionBreak.cloneNode(true));

  const cells = [
    ['Post Cards'],
  ];
  const postCardsBlock = WebImporter.DOMUtils.createTable(cells, document);
  finalBio.append(postCardsBlock);

  const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
  finalBio.append(metaBlock);

  makeProxySrcs(finalBio, 'https://www.keysight.com');
  return {
    element: finalBio,
    path,
  };
}

const tagMap = {};

function buildDiscoverBlog(document, el, url) {
  const pages = [];
  const report = {
    pdfUrls: [],
  };
  const meta = {
    Template: 'post',
  };

  const newDom = document.createElement('div');

  const sectionBreak = document.createElement('p');
  sectionBreak.innerHTML = '---';

  const h1 = el.querySelector('h1.title');
  const title = document.querySelector('title');
  meta.Title = title ? title.textContent : h1.textContent;
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    meta.Description = description.content;
  }

  const { tags } = document.body.dataset;
  if (tags) {
    const migratedTags = [];
    const timeRegex = /^[0-9]{1,2} min( (podcast|video))?$/;
    tags.toLowerCase().split(',').forEach((tag) => {
      if (timeRegex.test(tag)) {
        meta['Read Time'] = `${tag}${tag.includes('video') || tag.includes('podcast') ? '' : ' read'}`;
      } else {
        migratedTags.push(tag);
      }
    });
    if (migratedTags.length > 0) {
      meta['Migrated Tags'] = migratedTags.join(', ');
    }
  }

  const postMeta = el.querySelector('.uf-meta-data');

  let year = '2023';
  let month = '03';
  let day = '08';
  let author;
  if (postMeta) {
    const dt = postMeta.querySelector('.uf-datetime > time');
    if (dt) {
      const postDate = new Date(dt.getAttribute('datetime'));
      year = postDate.getFullYear();
      month = postDate.getMonth() + 1;
      if (month < 10) month = `0${month}`;
      day = postDate.getDate();
      if (day < 10) day = `0${day}`;
    }

    author = postMeta.querySelector('.uf-author > a');
    if (author) {
      meta.Author = author.textContent;
    } else {
      meta.Author = 'Keysight';
    }
  } else {
    meta.Author = 'Keysight';
  }
  meta['Publication Date'] = `${year}-${month}-${day}`;

  const authorBio = el.querySelector('.uf-author-profile');
  if (author && authorBio) {
    const authorPage = buildAuthorPage(document, authorBio, author);
    pages.push(authorPage);
  }

  const postContent = el.querySelector('.uf-item-entry-content');
  const image = document.querySelector('meta[name="og:image"]');
  const firstP = postContent.querySelector('p');
  const heroImg = firstP?.querySelector('img');
  if (heroImg) {
    newDom.append(heroImg);
  } else if (image) {
    const img = document.createElement('img');
    img.src = image.content;
    newDom.append(img);
  }
  newDom.append(sectionBreak);
  newDom.append(h1);

  if (image) {
    const img = document.createElement('img');
    img.src = image.content;
    meta.Image = img;
  } else if (heroImg) {
    meta.Image = heroImg.cloneNode(true);
  }

  newDom.append(postContent);
  newDom.append(sectionBreak.cloneNode(true));

  const h3 = document.createElement('h3');
  h3.textContent = 'Related Posts';
  newDom.append(h3);

  const cells = [
    ['Post Cards'],
    ['limit', '3'],
  ];
  const postCardsBlock = WebImporter.DOMUtils.createTable(cells, document);
  newDom.append(postCardsBlock);

  let path = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  const pathSplit = path.split('/');
  const tag = pathSplit[2].replace('-', ' ').split(' ').map((word) => `${word.charAt(0).toUpperCase()}${word.substr(1)}`).join(' ');
  path = `/blogs/keys/thought-leadership/${year}/${month}/${day}/${pathSplit.slice(3).join('/')}`;
  const prevTags = tagMap[path];
  if (prevTags) {
    prevTags.push(tag);
    meta.Tags = prevTags.join(', ');
    tagMap[path] = prevTags;
  } else {
    tagMap[path] = [tag];
    meta.Tags = tag;
  }

  const metaBlock = WebImporter.Blocks.getMetadataBlock(document, meta);
  newDom.append(metaBlock);

  // process a few blocks
  newDom.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('/')) {
      a.setAttribute('href', `https://www.keysight.com${href}`);
    }
  });

  newDom.querySelectorAll('.uf-flipbook.uf-embedded-content').forEach((flipBook) => {
    const iframe = flipBook.querySelector('iframe');
    const { src } = iframe;
    const u = new URL(`https://www.keysight.com/${src}`);
    report.pdfUrls.push(u.toString());
    const blockCells = [
      ['PDF Viewer'],
      ['Source', u.toString()],
    ];
    const block = WebImporter.DOMUtils.createTable(blockCells, document);
    flipBook.replaceWith(block);
  });

  newDom.querySelectorAll('video').forEach((video) => {
    const source = video.querySelector('source');
    const link = document.createElement('a');
    link.href = source.src;
    link.innerHTML = source.src;
    const blockCells = [
      ['Video'],
      ['Source', link],
    ];
    const block = WebImporter.DOMUtils.createTable(blockCells, document);
    video.replaceWith(block);
  });

  newDom.querySelectorAll('iframe').forEach((iframe) => {
    let blockName = 'Embed';
    let { src } = iframe;
    let normalizedSrc = src.startsWith('//') ? `https:${src}` : src;
    normalizedSrc = normalizedSrc.startsWith('/content/dam') ? `https://www.keysight.com${normalizedSrc}` : normalizedSrc;
    const sourceUrl = new URL(normalizedSrc);
    if (sourceUrl.hostname === 'www.youtube.com' && sourceUrl.pathname.startsWith('/embed/')) {
      const vid = sourceUrl.pathname.split('/')[2];
      src = `https://www.youtube.com/watch?v=${vid}`;
    } else {
      src = normalizedSrc;
    }

    if (sourceUrl.hostname === ('www.keysight.com') && sourceUrl.pathname.endsWith('.mp4')) {
      blockName = 'Video';
    }

    const link = document.createElement('a');
    link.href = src;
    link.innerHTML = src;
    const blockCells = [
      [blockName],
      ['Source', link],
    ];
    const block = WebImporter.DOMUtils.createTable(blockCells, document);
    iframe.replaceWith(block);
  });

  makeProxySrcs(newDom, 'https://www.keysight.com');
  pages.push({
    element: newDom,
    path,
    report,
  });
  return pages;
}

export default {
  /**
   * Apply DOM operations to the provided document and return an array of
   * objects ({ element: HTMLElement, path: string }) to be transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {Array} The { element, path } pairs to be transformed
   */
  transform: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    const urlObject = new URL(params.originalURL);

    // TODO
    const article = document.querySelector('.uf-article');
    return buildDiscoverBlog(document, article, urlObject);
  },
};
