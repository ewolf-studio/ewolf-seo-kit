'use strict';
/* Cœur du seo-kit : fonctions PURES config -> chaînes.
   Aucune I/O ici (voir cli.js / inject.js). Réutilisable par d'autres
   adaptateurs (ex. composant React) plus tard. */

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escXml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Normalise l'URL du site (sans slash final) et construit une URL absolue.
function siteBase(cfg) {
  const u = (cfg.siteUrl || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//.test(u)) {
    throw new Error('seo.config: "siteUrl" doit être une URL absolue (https://…). Reçu: ' + JSON.stringify(cfg.siteUrl));
  }
  return u;
}
function abs(cfg, pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return siteBase(cfg) + '/' + String(pathOrUrl).replace(/^\/+/, '');
}

const LLMS_PATH = 'llms.txt';

// ---- <head> : balises SEO / OG / Twitter / découvrabilité LLM ----
function headTags(cfg) {
  const base = siteBase(cfg);
  const llmsUrl = base + '/' + LLMS_PATH;
  const img = cfg.image ? abs(cfg, cfg.image) : '';
  const T = [];
  const push = (s) => T.push(s);

  if (cfg.title) push(`<title>${escHtml(cfg.title)}</title>`);
  if (cfg.description) push(`<meta name="description" content="${escHtml(cfg.description)}">`);
  if (Array.isArray(cfg.keywords) && cfg.keywords.length)
    push(`<meta name="keywords" content="${escHtml(cfg.keywords.join(', '))}">`);
  push(`<link rel="canonical" href="${escHtml(base + '/')}">`);

  // Découvrabilité pour agents IA / LLM
  push(`<meta name="ai-content" content="${escHtml(llmsUrl)}">`);
  push(`<link rel="alternate" type="text/markdown" href="${escHtml(llmsUrl)}" title="${escHtml(cfg.llmsTitle || 'Version markdown')}">`);

  push(`<meta name="robots" content="${escHtml(cfg.robotsMeta || 'index, follow')}">`);
  if (cfg.author) push(`<meta name="author" content="${escHtml(cfg.author)}">`);

  // Open Graph
  push('');
  push('<!-- Open Graph -->');
  push(`<meta property="og:type" content="${escHtml(cfg.ogType || 'website')}">`);
  push(`<meta property="og:url" content="${escHtml(base + '/')}">`);
  if (cfg.title) push(`<meta property="og:title" content="${escHtml(cfg.ogTitle || cfg.title)}">`);
  if (cfg.description) push(`<meta property="og:description" content="${escHtml(cfg.ogDescription || cfg.description)}">`);
  if (img) {
    push(`<meta property="og:image" content="${escHtml(img)}">`);
    if (cfg.imageWidth) push(`<meta property="og:image:width" content="${escHtml(cfg.imageWidth)}">`);
    if (cfg.imageHeight) push(`<meta property="og:image:height" content="${escHtml(cfg.imageHeight)}">`);
    if (cfg.imageAlt) push(`<meta property="og:image:alt" content="${escHtml(cfg.imageAlt)}">`);
  }
  if (cfg.locale) push(`<meta property="og:locale" content="${escHtml(cfg.locale)}">`);
  if (cfg.siteName) push(`<meta property="og:site_name" content="${escHtml(cfg.siteName)}">`);

  // Twitter
  push('');
  push('<!-- Twitter -->');
  push(`<meta name="twitter:card" content="${escHtml(img ? 'summary_large_image' : 'summary')}">`);
  if (cfg.title) push(`<meta name="twitter:title" content="${escHtml(cfg.ogTitle || cfg.title)}">`);
  if (cfg.description) push(`<meta name="twitter:description" content="${escHtml(cfg.ogDescription || cfg.description)}">`);
  if (img) push(`<meta name="twitter:image" content="${escHtml(img)}">`);
  if (img && cfg.imageAlt) push(`<meta name="twitter:image:alt" content="${escHtml(cfg.imageAlt)}">`);

  // Données structurées (schema.org) — objet ou tableau d'objets.
  if (cfg.jsonLd) {
    const items = Array.isArray(cfg.jsonLd) ? cfg.jsonLd : [cfg.jsonLd];
    items.forEach((obj) => {
      // JSON.stringify empêche l'injection ; on neutralise '<' par sûreté.
      const json = JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
      push('');
      push('<script type="application/ld+json">');
      push(json);
      push('</script>');
    });
  }

  return T.join('\n');
}

// ---- <p class="sr-only"> : intro indexable (visible lecteurs d'écran) ----
function srOnlyTag(cfg) {
  const base = siteBase(cfg);
  const txt = cfg.srOnly || cfg.description || '';
  const full = txt
    ? `${txt} Version machine (texte) : ${base}/${LLMS_PATH}`
    : `Version machine (texte) : ${base}/${LLMS_PATH}`;
  return `<p class="sr-only">${escHtml(full)}</p>`;
}

// ---- <noscript> : message si JS désactivé + pointeur llms.txt ----
function noscriptTag(cfg) {
  const base = siteBase(cfg);
  const msg = cfg.noscript || 'Cette page nécessite JavaScript.';
  return [
    '<noscript>',
    `  <p style="padding:20px;color:#ddd;font-family:system-ui,sans-serif;">${escHtml(msg)}</p>`,
    `  <p style="padding:0 20px 20px;color:#8a857a;font-family:system-ui,sans-serif;font-size:12px;">Version machine de cette page : ${escHtml(base + '/' + LLMS_PATH)}</p>`,
    '</noscript>'
  ].join('\n');
}

// ---- llms.txt ----
function llmsTxt(cfg) {
  if (typeof cfg.llms === 'string' && cfg.llms.trim()) return cfg.llms.replace(/\s+$/, '') + '\n';
  const base = siteBase(cfg);
  const lines = [];
  lines.push(`# ${cfg.title || cfg.siteName || base}`);
  lines.push('');
  if (cfg.description) { lines.push(`> ${cfg.description}`); lines.push(''); }
  lines.push(`- URL : ${base}/`);
  if (cfg.siteName) lines.push(`- Site : ${cfg.siteName}`);
  if (cfg.author) lines.push(`- Auteur : ${cfg.author}`);
  lines.push('');
  return lines.join('\n');
}

// ---- robots.txt ----
function robotsTxt(cfg) {
  const base = siteBase(cfg);
  const allowAll = cfg.robots == null ? true : !!cfg.robots.allow;
  const lines = ['User-agent: *'];
  lines.push(allowAll ? 'Allow: /' : 'Disallow: /');
  lines.push('');
  lines.push(`Sitemap: ${base}/sitemap.xml`);
  lines.push('');
  return lines.join('\n');
}

// ---- sitemap.xml ----
function sitemapXml(cfg) {
  const base = siteBase(cfg);
  const routes = (Array.isArray(cfg.sitemap) && cfg.sitemap.length) ? cfg.sitemap : ['/'];
  const urls = routes.map((r) => {
    const loc = /^https?:\/\//.test(r) ? r : base + '/' + String(r).replace(/^\/+/, '');
    return `  <url><loc>${escXml(loc)}</loc></url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    ''
  ].join('\n');
}

module.exports = {
  escHtml, escXml, abs, siteBase,
  headTags, srOnlyTag, noscriptTag,
  llmsTxt, robotsTxt, sitemapXml,
};
