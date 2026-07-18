#!/usr/bin/env node
'use strict';
/* seo-kit — générateur SEO / llms.txt pour sites statiques eWolf.
   Usage : seo-kit build [--config seo.config.json] [--dir public] [--check]
   Consommable via : npx github:ewolf-studio/ewolf-seo-kit build */

const fs = require('fs');
const path = require('path');
const gen = require('./lib/generate');
const { injectAll } = require('./lib/inject');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i++; }
      else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

function readConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    fail(`Config introuvable : ${configPath}\n→ Crée un seo.config.json (voir seo.config.example.json).`);
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    fail(`seo.config.json invalide (JSON) : ${e.message}`);
  }
}

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }
function ok(msg) { console.log('  ' + msg); }

function writeFile(dir, name, content, check, changes) {
  const p = path.join(dir, name);
  const prev = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (prev === content) { ok(`= ${name} (inchangé)`); return; }
  changes.push(name);
  if (check) { ok(`~ ${name} (serait mis à jour)`); return; }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
  ok(`✓ ${name}`);
}

function build(args) {
  const configPath = path.resolve(args.config || 'seo.config.json');
  const dir = path.resolve(args.dir || 'public');
  const check = !!args.check;
  const cfg = readConfig(configPath);

  if (!fs.existsSync(dir)) fail(`Dossier cible introuvable : ${dir} (utilise --dir).`);
  const indexPath = path.join(dir, 'index.html');
  if (!fs.existsSync(indexPath)) fail(`index.html introuvable dans ${dir}.`);

  console.log(`seo-kit build — config: ${path.relative(process.cwd(), configPath)} · dir: ${path.relative(process.cwd(), dir)}${check ? ' · [check]' : ''}`);
  const changes = [];

  // 1) Artefacts texte
  writeFile(dir, 'llms.txt', gen.llmsTxt(cfg), check, changes);
  writeFile(dir, 'robots.txt', gen.robotsTxt(cfg), check, changes);
  writeFile(dir, 'sitemap.xml', gen.sitemapXml(cfg), check, changes);

  // 2) Injection dans index.html
  const html = fs.readFileSync(indexPath, 'utf8');
  const head = gen.headTags(cfg);
  const body = gen.srOnlyTag(cfg) + '\n' + gen.noscriptTag(cfg);
  const out = injectAll(html, { head, body });

  // Avertit si des balises SEO en dur subsistent hors des marqueurs (doublons).
  // On retire le bloc seo-kit PUIS tous les commentaires HTML (pour ne pas
  // confondre un « <title> » cité dans un commentaire avec une vraie balise).
  const outsideMarkers = out
    .replace(/<!-- seo-kit:head:start[\s\S]*?<!-- seo-kit:head:end -->/i, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (/<title[\s>]/i.test(outsideMarkers))
    console.warn('  ⚠ un <title> statique subsiste dans <head> hors seo-kit → doublon. Retire-le (seo-kit gère le titre).');
  if (/<meta\s+name=["']description["']/i.test(outsideMarkers))
    console.warn('  ⚠ un <meta name="description"> statique subsiste hors seo-kit → doublon. Retire-le.');

  if (out !== html) {
    changes.push('index.html');
    if (check) ok('~ index.html (balises seo-kit seraient mises à jour)');
    else { fs.writeFileSync(indexPath, out); ok('✓ index.html (balises injectées)'); }
  } else ok('= index.html (inchangé)');

  if (check) {
    if (changes.length) { console.error(`\n✗ ${changes.length} fichier(s) non à jour : ${changes.join(', ')}`); process.exit(2); }
    console.log('\n✓ Tout est à jour.');
  } else {
    console.log(`\n✓ Terminé (${changes.length} modifié(s)).`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'build';
  if (args.help || args.h || cmd === 'help') {
    console.log(`seo-kit — SEO / llms.txt pour sites statiques eWolf

Usage:
  seo-kit build [options]     Génère llms/robots/sitemap et injecte les balises
                              SEO + sr-only + noscript dans public/index.html

Options:
  --config <path>   Fichier de config (défaut: seo.config.json)
  --dir <path>      Dossier du site à écrire (défaut: public)
  --check           N'écrit rien ; sort en erreur si non à jour (CI / pre-commit)
  --help            Cette aide

Marqueurs d'injection (auto-créés au 1er run) :
  <!-- seo-kit:head:start --> … <!-- seo-kit:head:end -->  dans <head>
  <!-- seo-kit:body:start --> … <!-- seo-kit:body:end -->  après <body>`);
    return;
  }
  if (cmd !== 'build') fail(`Commande inconnue : ${cmd} (voir --help).`);
  build(args);
}

main();
