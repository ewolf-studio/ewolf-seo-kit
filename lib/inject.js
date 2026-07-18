'use strict';
/* Injection idempotente de blocs générés dans un fichier HTML, entre marqueurs.
   Si les marqueurs sont absents, le bloc est inséré à un point d'ancrage
   (avant </head> ou après <body>) AVEC ses marqueurs, pour les runs suivants. */

// Construit un bloc encadré par des marqueurs de commentaire HTML.
function wrap(name, content) {
  return `<!-- seo-kit:${name}:start (généré — ne pas éditer à la main) -->\n${content}\n<!-- seo-kit:${name}:end -->`;
}

function markerRegex(name) {
  return new RegExp(
    `<!-- seo-kit:${name}:start[\\s\\S]*?<!-- seo-kit:${name}:end -->`,
    'i'
  );
}

// Remplace le bloc existant, sinon l'insère après `anchorRegex` (ou avant, selon `where`).
function injectBlock(html, name, content, anchorRegex, where) {
  const block = wrap(name, content);
  const re = markerRegex(name);
  if (re.test(html)) return html.replace(re, block);

  const m = anchorRegex.exec(html);
  if (!m) {
    throw new Error(`Point d'ancrage introuvable pour "${name}" (${anchorRegex}). Ajoute des marqueurs seo-kit ou l'élément attendu.`);
  }
  const idx = m.index;
  if (where === 'before') {
    return html.slice(0, idx) + block + '\n' + html.slice(idx);
  }
  // after
  const end = idx + m[0].length;
  return html.slice(0, end) + '\n' + block + html.slice(end);
}

// Injecte head (avant </head>) et body (après <body …>).
function injectAll(html, { head, body }) {
  let out = html;
  if (head != null) out = injectBlock(out, 'head', head, /<\/head>/i, 'before');
  if (body != null) out = injectBlock(out, 'body', body, /<body[^>]*>/i, 'after');
  return out;
}

module.exports = { injectAll, wrap, markerRegex };
