/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global window, navigator, document, fetch, performance, PerformanceObserver,
          FontFace, sessionStorage, Image */
/* eslint-disable no-console */

/**
 * Loads a CSS file.
 * @param {string} href The path to the CSS file
 */
 export function loadCSS(href) {
  if (!document.querySelector(`head > link[href="${href}"]`)) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', href);
    link.setAttribute('importance', 'low');
    link.onload = () => {
    };
    link.onerror = () => {
    };
    document.head.appendChild(link);
  }
}

export function toClassName(name) {
    return name && typeof name === 'string'
      ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-')
      : '';
  }
  
  export function createTag(name, attrs) {
    const el = document.createElement(name);
    if (typeof attrs === 'object') {
      for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
      }
    }
    return el;
  }

  function addClasses($elems, classes) {
    $elems.forEach(($elem, i) => {
      $elem.classList.add(classes[i]);
    });
  }

  async function decorateHeader() {
    const $header = document.querySelector('header');
    const resp = await fetch('/nav.plain.html');
    const text = await resp.text();
    const $div = createTag('div', {class: 'nav'});
    $div.innerHTML = text;
    const navs = [...$div.children];
    addClasses(navs, ['nav-top', 'nav-bottom']);
    addClasses([...navs[0].children], ['nav-global', 'nav-items']);
    addClasses([...navs[1].children], ['nav-left', 'nav-center', 'nav-right']);
    $header.appendChild($div); 
  }
  
  function decorateBlocks() {
    document.querySelectorAll('main div.section-wrapper > div > div').forEach(($block) => {
      const classes = Array.from($block.classList.values());
      let blockName = classes[0];
      const $section = $block.closest('.section-wrapper');
      if ($section) {
        $section.classList.add(`${blockName}-container`.replace(/--/g, '-'));
      }
      const blocksWithOptions = [];
      blocksWithOptions.forEach((b) => {
        if (blockName.startsWith(`${b}-`)) {
          const options = blockName.substring(b.length + 1).split('-').filter((opt) => !!opt);
          blockName = b;
          $block.classList.add(b);
          $block.classList.add(...options);
        }
      });
      $block.classList.add('block');
      $block.setAttribute('data-block-name', blockName);
    });
  }
  
  function loadBlocks() {
    document.querySelectorAll('main div.section-wrapper > div > .block').forEach(async ($block) => {
      const blockName = $block.getAttribute('data-block-name');
      import(`/blocks/${blockName}/${blockName}.js`)
        .then((mod) => {
          if (mod.default) {
            mod.default($block, blockName, document);
          }
        })
        .catch((err) => console.log(`failed to load module for ${blockName}`, err));
  
      loadCSS(`/blocks/${blockName}/${blockName}.css`);
    });
  }
  
  export function loadScript(url, callback, type) {
    const $head = document.querySelector('head');
    const $script = createTag('script', { src: url });
    if (type) {
      $script.setAttribute('type', type);
    }
    $head.append($script);
    $script.onload = callback;
    return $script;
  }
  
  function postLCP() {
    decorateHeader();
    loadBlocks();
    loadCSS('/lazy-styles.css');
  }
  
  
  function setLCPTrigger() {
    const $lcpCandidate = document.querySelector('main > div:first-of-type img');
    if ($lcpCandidate) {
      if ($lcpCandidate.complete) {
        postLCP();
      } else {
        $lcpCandidate.addEventListener('load', () => {
          postLCP();
        });
        $lcpCandidate.addEventListener('error', () => {
          postLCP();
        });
      }
    } else {
      postLCP();
    }
  }
  
  function supportsWebp() {
    return window.webpSupport;
  }
  
  // Google official webp detection
  function checkWebpFeature(callback) {
    const webpSupport = sessionStorage.getItem('webpSupport');
    if (!webpSupport) {
      const kTestImages = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
      const img = new Image();
      img.onload = () => {
        const result = (img.width > 0) && (img.height > 0);
        window.webpSupport = result;
        sessionStorage.setItem('webpSupport', result);
        callback();
      };
      img.onerror = () => {
        sessionStorage.setItem('webpSupport', false);
        window.webpSupport = false;
        callback();
      };
      img.src = `data:image/webp;base64,${kTestImages}`;
    } else {
      window.webpSupport = (webpSupport === 'true');
      callback();
    }
  }
  
  export function getOptimizedImageURL(src) {
    const url = new URL(src, window.location.href);
    let result = src;
    const { pathname, search } = url;
    if (pathname.includes('media_')) {
      const usp = new URLSearchParams(search);
      usp.delete('auto');
      if (!supportsWebp()) {
        if (pathname.endsWith('.png')) {
          usp.set('format', 'png');
        } else if (pathname.endsWith('.gif')) {
          usp.set('format', 'gif');
        } else {
          usp.set('format', 'pjpg');
        }
      } else {
        usp.set('format', 'webply');
      }
      result = `${src.split('?')[0]}?${usp.toString()}`;
    }
    return (result);
  }
  
  function resetAttribute($elem, attrib) {
    const src = $elem.getAttribute(attrib);
    if (src) {
      const oSrc = getOptimizedImageURL(src);
      if (oSrc !== src) {
        $elem.setAttribute(attrib, oSrc);
      }
    }
  }
  
  export function webpPolyfill(element) {
    if (!supportsWebp()) {
      element.querySelectorAll('img').forEach(($img) => {
        resetAttribute($img, 'src');
      });
      element.querySelectorAll('picture source').forEach(($source) => {
        resetAttribute($source, 'srcset');
      });
    }
  }

  /**
 * Turn leading image into a title section.
 */

function createHeroSection() {
    const $headerImg = document.querySelector('main>div:first-of-type>div>:first-child>picture>img');
    if ($headerImg) {
      const src = $headerImg.getAttribute('src');
      const $wrapper = $headerImg.closest('.section-wrapper');
      $wrapper.style.backgroundImage = `url(${src})`;
      $wrapper.classList.add('hero');
      $headerImg.parentNode.remove();
    }
  }
  
  function wrapSections(element) {
    document.querySelectorAll(element).forEach(($div) => {
      if (!$div.id) {
        const $wrapper = createTag('div', { class: 'section-wrapper' });
        $div.parentNode.appendChild($wrapper);
        $wrapper.appendChild($div);
      }
    });
  }

  async function decoratePage() {
    wrapSections('main > div');
    checkWebpFeature(() => {
      webpPolyfill(document);
    });
    createHeroSection();
    decorateBlocks();
    setLCPTrigger();
    //preloadFonts();

    const $main = document.querySelector('main'); 
    $main.classList.add('appear');
  }
  
  decoratePage();
  
  /* performance instrumentation */
  
  function stamp(message) {
    console.log(`${new Date() - performance.timing.navigationStart}ms: ${message}`);
  }
  
  function registerPerformanceLogger() {
    try {
      const polcp = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        stamp(JSON.stringify(entries));
      });
      polcp.observe({ type: 'largest-contentful-paint', buffered: true });
      const pores = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry) => {
          stamp(`resource loaded: ${entry.name} - [${Math.round(entry.startTime + entry.duration)}]`);
        });
      });
  
      pores.observe({ type: 'resource', buffered: true });
    } catch (e) {
      // no output
    }
  }

  if (window.name.includes('performance')) registerPerformanceLogger();
