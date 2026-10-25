# AGENTS.md

Guidance for coding agents working in this repository.

## Project

Personal knowledge base / wiki built with **MaterialX** (the maintained fork of MkDocs Material, `theme.name: materialx`) on **ProperDocs** (the maintained MkDocs 1.6 fork, `properdocs` CLI; it aliases `mkdocs.*` imports so plugins run unchanged), hosted at <https://wiki.jdelgado.fr/> via GitHub Pages. Content is 240+ Markdown files organized by SRE/infra topics.

Config lives in `mkdocs.yml` (no `nav:` - sidebar is auto-generated). Active plugins that matter at build time:

- `social` - OG cards, needs `pillow`+`cairosvg`
- `privacy` - self-hosts external assets (see Gotchas); its cache is keyed on `docs/**/*.md` in CI
- `git-revision-date-localized` - needs full git history; feeds `datePublished`/`dateModified` in the JSON-LD and `<lastmod>` in the sitemap
- `meta` - applies `.meta.yml` directory defaults (mostly `tags:`) to every page below
- `tags` - builds the tag index from front matter + `.meta.yml`
- `glightbox`, `redirects`, `minify`, `search` (French)

Theme overrides live in `overrides/` (`custom_dir`):

- `main.html` (`fonts` block) - Google Fonts linked from the HTML with the latin woff2 preloaded (self-hosted by `privacy`); the preload URLs pin the font version, update them on a bump.
- `main.html` (`extrahead` block) - Google Search Console meta tag, `og:locale`, and the Schema.org JSON-LD graph: `WebSite` + `Person` (anchored on `about/#author`) + `TechArticle` per page (`ProfilePage` on `about.md`, `image` = the social card) + a `BreadcrumbList` built from the nav sections that own an `index.md` (subfolders without one have no page, linking them gave 404 crumbs). A page's front matter `description` lands in the `TechArticle`, so a missing description degrades structured data silently.
- `sitemap.xml` - custom template emitting `<lastmod>` from the git revision date.
- `home.html`, `category.html`, `tags.html`, `404.html` and `partials/` - the redesigned theme (pinned to MaterialX's HTML: Renovate never automerges `mkdocs-materialx`, review every bump visually).
- `partials/integrations/analytics/google.html` - Material's GA partial, but `gtag.js` loads on the first interaction or 10 s after load. Re-check it on a `mkdocs-materialx` bump.
- `i18n/<language>.yml` - every theme UI string, read through `lang.t("jd.*")` in templates and `window.jdI18n` in scripts. Add new UI text there, never hardcoded.

Build hooks (`hooks:` in `mkdocs.yml`):

- `indexes.py` - virtual `index.md` for every folder without one (rendered by `category.html`), nav section titles and order
- `article_meta.py` - reading time, series, backlinks ("Cité dans"), outdated banner (> 2 years without a content commit; commits touching more than 10 articles are sweeps and ignored)
- `page_vars.py` - front matter `variables:` handed to `jd-vars.js`
- `home.py` - recent articles and section counts for the home and tags pages
- `i18n.py` - loads `overrides/i18n/`
- `bundle.py` - concatenates, minifies and content-hashes `extra_css` and `extra_javascript` into `stylesheets/bundle.<hash>.css` and a deferred `javascripts/bundle.<hash>.js`. The lists in `mkdocs.yml` stay the source, in cascade order; a new stylesheet or script is added there as before. Template CSS stays in the bundle: `navigation.instant` keeps the `<head>`.
- `a11y.py` - `aria-label` (`jd.code.line`) on the line-number links of code blocks

`remote_branch: docs` in `mkdocs.yml` is why `gh-deploy` pushes to a `docs` branch rather than `gh-pages`.

## Local Development

```bash
# First-time setup
uv sync
pre-commit install   # install git hook for markdown linting

# Live preview (hot reload at http://127.0.0.1:8000, ~6s rebuild)
uv run properdocs serve -f mkdocs.dev.yml --livereload

# Static build (validates without serving)
uv run properdocs build --strict
```

## Linting

- **Inline disable/enable**: always specify rule names (e.g. `MD046`).
  A bare `markdownlint-enable` without rule names re-enables ALL rules,
  overriding `.markdownlint.json` globals (including MD013).

Four pre-commit hooks run (`.pre-commit-config.yaml`):

- `uv-lock` - keeps `uv.lock` in sync with `pyproject.toml`
- `markdownlint-cli2` - on changed `.md` files, config `.markdownlint.json`
- `check-code-blocks` - `.pre-commit-hooks/check_code_blocks.py`, on changed `.md` under `docs/`. Parses every `yaml` and `json` fence, and runs `promtool check rules` on blocks that are full Prometheus rule files. Catches snippets a reader would copy-paste and that cannot work. For a deliberately broken counter-example, put `<!-- check-code-blocks: skip -->` on the line before the fence.
- `convert-images-to-webp` - `.pre-commit-hooks/convert_to_webp.sh`, on staged JPEG/PNG under `docs/`. It converts, stages the `.webp`, deletes the original, then **exits 1 on purpose** - the first `git commit` always "fails", just re-run it. Needs `cwebp` (`brew install webp`).

Rules are in `.markdownlint.json`:

- MD013 (line length): **disabled**
- MD024 (duplicate headings): allowed within siblings only
- MD055 (table borders): must be `leading_and_trailing`
- MD046 (code block style): must be consistent per file

Run manually:

```bash
pre-commit run --all-files
# or on specific files:
markdownlint-cli2 "docs/**/*.md"
```

## Deployment

GitHub Actions (`.github/workflows/main.yml`) runs three chained jobs - `lint` → `build` → `deploy`:

1. `lint` - markdownlint-cli2 on `.md` files changed in the push/PR (step skipped when none changed)
2. `build` - `uv sync` + `uv run properdocs build --strict`; warnings are fatal
3. `deploy` - `uv run properdocs gh-deploy --force -d site/` → pushes the built site to the `docs` branch → GitHub Pages

Pull requests run `lint` + `build` only (`deploy` is gated on `github.event_name != 'pull_request'`). A push or PR touching only repo tooling (`AGENTS.md`, `README.md`, `LICENSE`, `renovate.json`, lint and pre-commit config, `.claude/`) skips `build` and `deploy`: the list is `files_ignore` in the `lint` job, and a skipped `build` still satisfies the required check. Every job checks out with `fetch-depth: 0` because `git-revision-date-localized` needs the full history. No manual deploy needed.

Dependencies are managed by Renovate (`renovate.json`): minor, patch and digest updates automerge once `build` is green; majors wait for manual review.

## Content Structure

All content lives under `docs/`. Organized by technology domain:

| Directory | Topics |
|-----------|--------|
| `linux/` | fundamentals, security, CLI, shell, storage, systemd, networking, BSD/CentOS notes |
| `automation/` | Ansible, Terraform, Makefile |
| `databases/` | MySQL, Postgres, Redis, Elasticsearch, MongoDB, Memcached |
| `monitoring/` | LGTM stack, check_mk, Munin |
| `kubernetes/` | CLI, deployments, ArgoCD, operators, RKE, Rancher, troubleshooting |
| `cloud/` | AWS, Azure, GCloud |
| `containers/` | Docker, Kafka |
| `ci-cd/` | GitHub Actions, GitLab |
| `networking/` | Cisco, MikroTik, pfSense |
| `os/` | macOS, Windows, misc desktop |
| `selfhost/` | Self-hosted apps (Nextcloud, Koel, etc.) |
| `web/` | nginx, HAProxy, Varnish, DNS, mail, WordPress |
| `hardware/` | NIC, HDD, SAN, server |
| `hypervisor/` | ESXi, Proxmox |
| `misc/` | Perf, optimization, fibre optique, links, sources |

Sidebar navigation is **auto-generated** from the `docs/` directory structure (no `nav:` in `mkdocs.yml`).

One hand-maintained TOC must be updated when adding a file - it is not generated, and a stale link only surfaces as a `--strict` build failure:

- `docs/index.md` - global landing page

`docs/<section>/index.md` (every content section has one) only feeds its title, description and intro paragraph: `hooks/indexes.py` renders it with `category.html` and drops everything from its first `##` heading, so the article list is generated from the folder. A folder holding a single article (recursively) gets a redirect page to that article instead of a category page, and every link to the folder is rewritten to the article.

Non-Markdown files under `docs/` are copied verbatim into the build:

- `docs/robots.txt` - points at the sitemap; splits AI bots by intent, not a blanket
  block: search and user-triggered fetchers (OAI-SearchBot, ChatGPT-User,
  Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User) are allowed,
  training crawlers (GPTBot, ClaudeBot, anthropic-ai, CCBot, Bytespider,
  Google-Extended, Applebot-Extended, Diffbot, cohere-ai) are disallowed. GPTBot and
  ClaudeBot are training crawlers, not search bots. `Content-Signal`
  (`ai-train=no, search=yes, ai-input=yes`) sits inside the `*` and search groups:
  a line after the last group binds to that group only
- `docs/llms.txt` - hand-maintained section map for LLM consumption; update it when a whole section appears or disappears
- `docs/javascripts/copy-llm.js` - "Copy for LLM" button, converts the rendered article back to Markdown client-side
- `docs/stylesheets/jdelgado.css`, `docs/img/`, `docs/CNAME`

`docs/about.md` is the author page - the Schema.org `Person` node in `overrides/main.html` is anchored on its URL (`about/#author`), so don't rename or move it.

## Commit Convention

Scoped conventional commits following the content path:

```text
type(section/subsection): message
# Examples:
feat(kubernetes/cli): add helm rollback command
fix(linux/security): correct firewall rule syntax
change(cloud/gcloud): add billing export commands
```

## MkDocs Material Features in Use

- **Admonitions**: `!!! note`, `!!! warning`, `!!! tip`, etc.
- **Collapsible blocks**: `??? note` (collapsed by default)
- **Code blocks**: use fenced with language tag and optional title/lineno
- **Superfences**: nested code blocks inside admonitions work
- **Line number anchors**: `anchor_linenums: true` is active
- **Glightbox**: all images get a lightbox automatically (no extra syntax needed)
- **Redirects**: when moving/renaming a `.md` file, add an entry in `mkdocs.yml`

  ```yaml
  plugins:
    - redirects:
        redirect_maps:
          'old/path.md': 'new/path.md'
  ```

Example admonition:

```markdown
!!! warning "Title here"
    Content indented 4 spaces.
```

## Content Language

All article content is written in **French**. Code, commands, and commit messages stay in English.

## Before committing

Always run `properdocs build --strict` before committing file renames or new articles:

```bash
uv run properdocs build --strict 2>&1 | grep -E "WARNING|ERROR"
```

`docs/index.md` contains hardcoded links - renames break the build silently until CI catches it.

A green `--strict` build does not mean the page renders correctly (broken front matter, an
oversized SVG). Preview locally before committing a new or rewritten article.

## Article Writing Style

> ⚠️ These rules apply to **short reference articles**. For full tutorials (step-by-step
> install guides, multi-section walkthroughs), preserve pedagogical content:
> Lexique sections, concept explanations, and intro context - they are intentional.

- Short punchy intro - 1-3 sentences, blunt observation ("c'est la galère", "c'est pas génial")
- Use "on" throughout, not "vous" or passive
- Skip concept explanations - jump straight to how
- Minimal admonitions, only for truly critical warnings
- Bullet lists over tables when possible
- No "## Prérequis" or "## Conclusion" sections
- Stop when content is done, no wrap-up paragraph
- **Never use ASCII box diagrams** (┌─┐│└─┘) - looks AI-generated
- No exhaustive warning/tip boxes on every section

Language patterns:

- Prefer "sont" over "c'est des": "Les Spot VMs sont des instances..." not "c'est des instances..."
- No formal French technical vocabulary → plain language
- Mix English tech terms naturally in French: "inmaintenable at scale", `rotate` as a verb
- **Product names keep their official casing**, in prose, titles and tags: HAProxy, nginx, K8s, GitHub, GitLab, PostgreSQL, Elasticsearch, Alertmanager, Nextcloud, macOS, curl. A binary or a path in backticks stays lowercase (`haproxy -c`).
- **Never translate K8s/infra nouns**: registry, policy, limits, requests, namespace, label, binding - always left in English in French prose
- Use numbers at sentence start: "2 solutions s'offrent ici à nous..."
- Present alternatives explicitly: "on fait X ou on fait Y"
- Trailing `...` to cut a sentence short
- Prefer ratio/multiplier over percentages: "gain entre 4-5x" not "60% moins cher"
- **Always add a sentence before a code block** - a section title followed directly by a code block with no context feels abrupt
- **Never an em dash (`—`)**, anywhere: prose, headings, front matter descriptions, code-block comments. It is the most visible tell of generated text. Use `-`, a comma, a colon, or two sentences. Paired asides (`word — aside — rest`) become commas or parentheses, never two hyphens: it reads badly, and a `-` starting a line is parsed as a list item by markdownlint
- **Avoid meta-technical phrasing** : "the API changed completely compared to v2" → rephrase naturally ("no more `source vars`, it doesn't work anymore")

## Article Rewrite Workflow

When rewriting an article:

1. Read the existing file first
2. Fetch external sources if needed (dotfiles repo, upstream docs)
3. Write: practical examples, real-world use cases - commands copy-pasteable on the spot
4. **Wire the landing page** if it's a new file - `docs/index.md`, hardcoded link, always (section pages list their articles on their own)
5. Lint: `markdownlint-cli2 "path/to/file.md"`
6. Preview: serve with `mkdocs.dev.yml` (see "Preview" below), then open the article
   - URL pattern: `http://127.0.0.1:8000/<path-without-docs-prefix-and-md>/`
   - Example: `docs/linux/cli/sed.md` → `open http://127.0.0.1:8000/linux/cli/sed/`
7. Commit + push - CI validates automatically

After writing, add YAML front matter to the article:

```yaml
---
description: One-line description of the article (used for SEO).
tags:
  - RelevantTag
---
```

Quote the description whenever it contains `:`, `#`, `{`, `[` or an em dash. An unquoted
colon followed by a space breaks the YAML parser and the whole block renders as plain text
at the top of the article. The build stays green, so only a local preview catches it.

Directory-level tags come from `.meta.yml` files (the `meta` plugin) - add per-article tags
that are more specific than the directory defaults.

### Theme features: add them without being asked

When writing or rewriting an article, apply these whenever the condition holds (syntax in `README.md`):

- **Series**: the article is one of several that read in order (same topic split into parts, explicit "partie 2") → `series:` with the exact same name on every part + `series_order:`. Check `rg -n '^series:' docs` for an existing series first.
- **`tested_with`**: the article gives commands or configs tied to a version (flags, API fields, defaults) → list the versions actually tested, e.g. `"HAProxy 3.0+"`. Never invent one: no source, no badge.
- **`variables`**: the code blocks repeat a value the reader must replace (namespace, cluster, bucket, hostname) → declare it and write `<name>` in the blocks.
- **`skill`**: a skill distilled from the article exists in the `wiki` plugin of PixiBixi/claude-skills (`plugins/wiki/skills/<name>`) → set `skill: <name>`. Never for a skill that is not published there: the callout's install command would fail.
- **Glossary `*[TERM]: ...`**: an acronym or a jargon term the target reader may not know and that the prose does not explain (NUMA, IRQ, TTFB, fan-out) → add it to `includes/abbreviations.md` (wiki-wide, sorted), never at the bottom of the article. Check it is not already there. Not every acronym: K8s nouns, HTTP, CPU, DNS and the like are left alone. One sentence in French, no em dash.

## Gotchas

- **MaterialX**: its plugins register as `materialx/<name>`, so a template testing `config.plugins["material/search"]` silently drops the feature. `docs/stylesheets/materialx.css`, first in `extra_css`, undoes the MaterialX restyles the theme was not designed on (nav spacing, header icon sizes, TOC guides, letter spacing). Search must stay on `provider: lunr`: `jd-palette.js` reads `search/search_index.json`, Pagefind does not write it.

- **SVG diagrams - taille rendue**: un SVG scale à la largeur du contenu (~750px). La hauteur
  rendue = viewBox_height × (750 / viewBox_width). Préférer un layout horizontal pour les
  diagrammes séquentiels - un viewBox 580×110 donne ~143px de haut, un 520×390 donne ~563px.

- **Blocs YAML fragmentés**: plusieurs petits blocs montrant le même pattern (ex: même annotation
  sur 3 ressources différentes) → fusionner en un seul bloc avec `---` comme séparateur.

- **External images**: the `privacy` plugin downloads external assets to self-host them.
  A 403/unreachable URL triggers a warning → fatal with `--strict`.
  Always store images locally next to the `.md` file (e.g., `docs/selfhost/koel.webp`);
  the pre-commit hook converts any JPG/PNG to WebP anyway.

- **SVG diagrams**: store in `docs/<section>/_img/<name>.svg` - run `mkdir -p` first as the dir may not exist. Reference with `![](./_img/name.svg)` - Glightbox applies automatically.

- **Font preload URLs**: Google serves a different woff2 URL per user agent, so a URL fetched with `curl` does not match what the `privacy` plugin downloads. Read the preload URLs from the built `site/assets/external/fonts.googleapis.com/css2.*.css` (latin block), then write them as `https://fonts.gstatic.com/s/...` in `overrides/main.html`.

- **Hooks and i18n**: `on_page_content` runs before `on_env`, so `jd_t` does not exist yet in a page content hook. Read `overrides/i18n/<language>.yml` in `on_config` instead (see `hooks/a11y.py`).

- **Shallow clones**: the full `properdocs build` requires full git history due to `git-revision-date-localized`.
  Shallow clones (`--depth 1`) will cause errors. Use `git fetch --unshallow` if needed.
  Its `WARNING:root:` lines are non-blocking, even under `--strict`.

- **Preview: `properdocs serve` only with `mkdocs.dev.yml`**. With the full config the first build hangs for minutes (`social`, `privacy`, `git-revision-date-localized`); the dev config drops the production-only plugins and rebuilds in ~6s. `search` must stay in it: `hooks/article_meta.py` writes into its output dir. Hooks are not reloaded: restart the server after editing `hooks/`.

  ```bash
  # background; stop it with: pkill -f "properdocs serve"
  uv run properdocs serve -f mkdocs.dev.yml --livereload
  ```

  Social cards, git dates, feeds and redirects only exist in the full build. Check them, and run `--strict`, before committing:

  ```bash
  SITE="$TMPDIR/wiki-site"
  DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:$HOME/lib:/usr/local/lib:/usr/lib" \
    uv run properdocs build --strict -d "$SITE"
  # background, once; stop it with: pkill -f "http.server 8000"
  python3 -m http.server 8000 --bind 127.0.0.1 -d "$SITE"
  ```

  `DYLD_FALLBACK_LIBRARY_PATH` lets the `social` plugin find Homebrew's `libcairo`; without it `--strict` aborts on cairo warnings.
