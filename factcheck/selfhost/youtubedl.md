---
article: docs/selfhost/youtubedl.md
checked: '2026-11-10'
commit: 98fadb6ad4dbd7eb20fed5fdf97a72a7727e5f31
sources:
- repo: yt-dlp
  path: pyproject.toml
  lines: 49-58
  ref: 412e7f0a4
  commit: 412e7f0a4b0588fe884a02b344ac66a06538475b
unpinned: 4
---

# docs/selfhost/youtubedl.md

## Findings

- L10 OUTDATED corrigé : "publie toutes les quelques semaines" devient "publie régulièrement (une release toutes les quelques semaines à 2 mois)". Preuve : tags du clone yt-dlp @412e7f0a4 : 12 releases en 2026 (2026.01.29 ... 2026.03.17 à quelques jours d'écart, puis 06.09, 07.04, 08.19, 10.21, 10.26), 26 en 2025.
- L26 OUTDATED corrigé : paragraphe ajouté sur le runtime JS requis pour YouTube (deno seul activé par défaut, node/bun/QuickJS via `--js-runtimes`, repli sur moins de clients sans runtime) avec la commande d'install de deno. Preuve : README.md:203,213,215 (yt-dlp-ejs "Required for full YouTube support", runtime JS requis), :367-378 (`--js-runtimes`, "Only deno is enabled"), :1862 (`web` et `tv_samsung` omis sans runtime) @412e7f0a4.
- L23 IMPRECISE corrigé : `pipx install "yt-dlp[default]"`. Preuve : pyproject.toml:49-58 @412e7f0a4, l'extra `default` contient `yt-dlp-ejs==0.8.0`.
- L34 IMPRECISE corrigé : `-S "res:1080,vcodec:av01,vcodec:vp9"` devient `-S "res:1080,vcodec:av01"`, même chose dans le fichier de conf L93 ; le commentaire dit que AV1 puis VP9 vient de l'ordre par défaut de vcodec. Preuve : yt_dlp/utils/_utils.py:5516-5520 (`if field in self._order: return`, un champ dupliqué est ignoré) ; README.md:1618 (ordre `av01 > vp9.2 > vp9 > h265 ...`).
- L139 IMPRECISE rejeté : le fact-check confirme lui-même la date (dernier commit 2017-11-18), rien à changer.

## En plus

- L17 : le fichier `yt-dlp` de la release n'est pas un binaire autonome mais un zipimport qui demande Python 3.11+ ; commentaire corrigé. Preuve : README.md:97 ("Needs Python") et :196 (Python 3.11+) @412e7f0a4. Il embarque déjà le code d'ejs : README.md:145.

## Modernisation

- Runtime JS + `[default]` : appliqué.
- MeTube et Tube Archivist actifs : rien à changer, déjà cités.

## Tests

- Aucun test d'exécution : tout vient du clone yt-dlp @412e7f0a4 (2026-11-04). La commande `curl -fsSL https://deno.land/install.sh | sh` est l'installeur officiel de deno, non relancée ici.

## À signaler

- Sur un Linux sans Python 3.11, le binaire `yt-dlp_linux` (autonome, x86_64) est l'alternative au zipimport ; non ajouté à l'article.
