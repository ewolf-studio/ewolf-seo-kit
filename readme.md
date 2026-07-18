# @ewolf/seo-kit

Générateur **SEO + découvrabilité LLM** pour les sites statiques eWolf.
Zéro dépendance, agnostique du framework. À partir d'un seul `seo.config.json`, il :

- injecte les balises `<head>` (title, description, canonical, `ai-content`, `alternate` markdown, Open Graph, Twitter) dans `index.html` ;
- injecte un `<p class="sr-only">` (intro indexable) et un `<noscript>` (pointeur `llms.txt`) après `<body>` ;
- génère `llms.txt`, `robots.txt` et `sitemap.xml`.

L'injection HTML se fait **entre marqueurs**, donc idempotente : relancer ne duplique rien.

## Utilisation (sans installation)

```bash
npx github:ewolf-studio/ewolf-seo-kit build
```

À la racine d'un site (avec un dossier `public/` contenant `index.html`) :

```bash
npx github:ewolf-studio/ewolf-seo-kit build            # génère + injecte
npx github:ewolf-studio/ewolf-seo-kit build --check     # CI : échoue si non à jour
```

Options : `--config <path>` (défaut `seo.config.json`), `--dir <path>` (défaut `public`), `--check`, `--help`.

## Configuration

Copier `seo.config.example.json` en `seo.config.json` et renseigner. Champs :

| Champ | Rôle |
|---|---|
| `siteUrl` (**requis**) | URL absolue du site (base des URLs canoniques/OG). |
| `title`, `description`, `keywords` | Métadonnées principales. |
| `author`, `siteName`, `locale`, `lang` | Attribution / Open Graph. |
| `image`, `imageWidth`, `imageHeight` | Image OG/Twitter (chemin relatif → rendu absolu). |
| `srOnly` | Texte de l'intro `sr-only` (défaut : `description`). |
| `noscript` | Message affiché si JavaScript est désactivé. |
| `sitemap` | Liste des routes (défaut `["/"]`). |
| `robots` | `{ "allow": true|false }`. |
| `llms` | Contenu markdown de `llms.txt` inline (si vide, généré depuis title/description). |
| `llmsFile` | Chemin (relatif au config) d'un fichier markdown source pour `llms.txt`. Prioritaire sur la génération auto, ignoré si `llms` est renseigné. |

## Contrat d'injection

Le `<head>` de ta page **ne doit pas** contenir de `<title>` ni de `<meta name="description">` en dur : **seo-kit les gère** (sinon doublons — un avertissement le signale). Les marqueurs sont créés automatiquement au 1er run :

```html
<head>
  <meta charset="UTF-8">
  <!-- seo-kit gère title/description/OG/… ici -->
</head>
<body>
  <!-- seo-kit gère sr-only + noscript ici -->
  …ton contenu…
</body>
```

## Cœur réutilisable

`lib/generate.js` expose des fonctions pures (`headTags`, `srOnlyTag`, `noscriptTag`, `llmsTxt`, `robotsTxt`, `sitemapXml`) — base d'un futur adaptateur (ex. composant React) sans réécrire la logique.

## Tests

```bash
npm test
```
