'use strict';
/* Tests légers (zéro dépendance) : node test/run.js */
const assert = require('assert');
const gen = require('../lib/generate');
const { injectAll, markerRegex } = require('../lib/inject');

let n = 0;
function t(name, fn) { fn(); n++; console.log('  ✓ ' + name); }

const cfg = {
  siteUrl: 'https://demo.ewolf.online/',
  title: 'Démo & Test',
  description: 'Desc "citée".',
  keywords: ['a', 'b'],
  image: '/assets/preview.png',
  sitemap: ['/', '/x'],
};

t('siteBase retire le slash final', () => {
  assert.strictEqual(gen.siteBase(cfg), 'https://demo.ewolf.online');
});
t('siteUrl non-absolu -> erreur', () => {
  assert.throws(() => gen.siteBase({ siteUrl: 'demo.ewolf.online' }));
});
t('headTags échappe le HTML et met des URLs absolues', () => {
  const h = gen.headTags(cfg);
  assert.ok(h.includes('<title>Démo &amp; Test</title>'));
  assert.ok(h.includes('content="Desc &quot;citée&quot;."'));
  assert.ok(h.includes('href="https://demo.ewolf.online/llms.txt"'));
  assert.ok(h.includes('content="https://demo.ewolf.online/assets/preview.png"'));
});
t('robots référence le sitemap absolu', () => {
  assert.ok(gen.robotsTxt(cfg).includes('Sitemap: https://demo.ewolf.online/sitemap.xml'));
});
t('sitemap liste les routes en absolu', () => {
  const s = gen.sitemapXml(cfg);
  assert.ok(s.includes('<loc>https://demo.ewolf.online/</loc>'));
  assert.ok(s.includes('<loc>https://demo.ewolf.online/x</loc>'));
});
t('injection idempotente (2e run identique)', () => {
  const html = '<html><head></head><body></body></html>';
  const once = injectAll(html, { head: gen.headTags(cfg), body: gen.srOnlyTag(cfg) });
  const twice = injectAll(once, { head: gen.headTags(cfg), body: gen.srOnlyTag(cfg) });
  assert.strictEqual(once, twice);
  assert.ok(markerRegex('head').test(once));
});
t('injection sans point d\'ancrage -> erreur', () => {
  assert.throws(() => injectAll('<div></div>', { head: 'x' }));
});

// ---- Plugin Vite ----
const seoKit = require('../plugin-vite');

t('plugin: transformIndexHtml injecte head + body', () => {
  const p = seoKit(cfg);
  p.configResolved({ root: process.cwd() });
  const html = '<html><head></head><body><main></main></body></html>';
  const out = p.transformIndexHtml(html);
  assert.ok(out.includes('<title>Démo &amp; Test</title>'));
  assert.ok(out.includes('class="sr-only"'));
  assert.ok(out.includes('<noscript>'));
});

t('plugin: generateBundle émet les 3 artefacts', () => {
  const p = seoKit(cfg);
  p.configResolved({ root: process.cwd() });
  const emitted = {};
  p.generateBundle.call({ emitFile: (a) => { emitted[a.fileName] = a.source; } });
  assert.deepStrictEqual(Object.keys(emitted).sort(), ['llms.txt', 'robots.txt', 'sitemap.xml']);
  assert.ok(emitted['robots.txt'].includes('Sitemap: https://demo.ewolf.online/sitemap.xml'));
});

t('plugin: dev middleware sert /llms.txt', () => {
  const p = seoKit(cfg);
  p.configResolved({ root: process.cwd() });
  let served = null, headers = {};
  const handlers = [];
  p.configureServer({ middlewares: { use: (fn) => handlers.push(fn) } });
  const res = { setHeader: (k, v) => { headers[k] = v; }, end: (s) => { served = s; } };
  handlers[0]({ url: '/llms.txt' }, res, () => { served = 'NEXT'; });
  assert.ok(served && served.startsWith('# Démo'));
  assert.ok(/text\/plain/.test(headers['Content-Type']));
});

console.log(`\n${n} tests OK.`);
