'use strict';
/* Plugin Vite pour @ewolf/seo-kit.
   - injecte les balises SEO + sr-only + noscript dans index.html (transformIndexHtml) ;
   - émet llms.txt / robots.txt / sitemap.xml dans dist/ au build ;
   - les sert aussi pendant `vite dev`.

   Usage (vite.config.ts) :
     import seoKit from '@ewolf/seo-kit/vite';
     export default defineConfig({ plugins: [seoKit('seo.config.json')] });

   `options` : chemin d'un seo.config.json (défaut) OU l'objet de config directement. */

const fs = require('fs');
const path = require('path');
const gen = require('./lib/generate');
const { injectAll } = require('./lib/inject');

function loadConfig(input, root) {
  let cfg;
  if (input == null) input = 'seo.config.json';
  if (typeof input === 'string') {
    const p = path.resolve(root || process.cwd(), input);
    cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    cfg.__dir = path.dirname(p);
  } else {
    cfg = Object.assign({}, input);
    cfg.__dir = root || process.cwd();
  }
  // llmsFile : contenu llms.txt depuis un fichier markdown séparé
  if (cfg.llmsFile && !(typeof cfg.llms === 'string' && cfg.llms.trim())) {
    cfg.llms = fs.readFileSync(path.resolve(cfg.__dir, cfg.llmsFile), 'utf8');
  }
  return cfg;
}

function artifacts(cfg) {
  return [
    { file: 'llms.txt', content: gen.llmsTxt(cfg), type: 'text/plain; charset=utf-8' },
    { file: 'robots.txt', content: gen.robotsTxt(cfg), type: 'text/plain; charset=utf-8' },
    { file: 'sitemap.xml', content: gen.sitemapXml(cfg), type: 'application/xml; charset=utf-8' },
  ];
}

module.exports = function seoKit(options) {
  let cfg;
  return {
    name: 'ewolf-seo-kit',

    configResolved(resolved) {
      cfg = loadConfig(options, resolved.root);
    },

    transformIndexHtml(html) {
      const head = gen.headTags(cfg);
      const body = gen.srOnlyTag(cfg) + '\n' + gen.noscriptTag(cfg);
      return injectAll(html, { head, body });
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const a = artifacts(cfg).find((x) => url === '/' + x.file);
        if (!a) return next();
        res.setHeader('Content-Type', a.type);
        res.end(a.content);
      });
    },

    generateBundle() {
      for (const a of artifacts(cfg)) {
        this.emitFile({ type: 'asset', fileName: a.file, source: a.content });
      }
    },
  };
};

// Interop import par défaut ESM (import seoKit from '@ewolf/seo-kit/vite')
module.exports.default = module.exports;
