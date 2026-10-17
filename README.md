# wiki.jdelgado.fr

[![ci](https://github.com/PixiBixi/pixibixi.github.io/actions/workflows/main.yml/badge.svg)](https://github.com/PixiBixi/pixibixi.github.io/actions/workflows/main.yml)

Personal knowledge base built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/), hosted at <https://wiki.jdelgado.fr/>.
240+ French articles on Linux, Kubernetes, cloud, networking, databases and monitoring.

## Setup

Needs [uv](https://docs.astral.sh/uv/), plus `pre-commit` and `cwebp` on the `PATH`
(`brew install pre-commit webp`) - neither is pulled in by `uv sync`. `promtool`
(`brew install prometheus`) is optional: without it the code block hook still checks YAML
and JSON, it just skips the Prometheus rule files.

```sh
uv sync
pre-commit install     # without this, no hook runs on commit
uv run mkdocs serve    # http://127.0.0.1:8000
```

The full git history is required: `git-revision-date-localized` errors out on a shallow
clone (`git fetch --unshallow`).

## Add an article

One Markdown file under `docs/<section>/`, with front matter:

```yaml
---
description: "One line, feeds the meta description and the Schema.org TechArticle."
tags:
  - Kubernetes
---
```

Quote the description if it contains a colon, otherwise the YAML block silently renders as
plain text. Directory-wide tags come from `.meta.yml` files.

Optional front matter, all rendered by the theme:

| Key | Example | Effect |
|---|---|---|
| `series` + `series_order` | `series: "Thanos at scale"`, `series_order: 2` | Series box with numbering and a "next" link, grouped by exact series name |
| `tested_with` | `["Thanos 0.35+", "Redis Sentinel 6.2+"]` | "Testé avec" badge, `TechArticle.dependencies` in the JSON-LD |
| `variables` | `[{name: namespace, default: monitoring}]` | Editable bar above the article; `<namespace>` in code blocks is substituted on display and on copy |

Glossary tooltips (hover, tap on mobile) use the `abbr` extension. Definitions live in
`includes/abbreviations.md`, appended to every page, so a term is defined once for the whole
wiki. One line per term, sorted:

```markdown
*[NUMA]: Non-Uniform Memory Access, une machine multi-socket où la latence mémoire dépend du CPU
```

The theme UI strings live in `overrides/i18n/<language>.yml` (English is the fallback).

Tag icons are mapped in `extra.tag_icons` in `mkdocs.yml` (tag name to a Material `.icons` path, e.g. `Kubernetes: simple/kubernetes`). Unmapped tags show no icon.

RSS feeds (`feed_rss_created.xml`, `feed_rss_updated.xml`) come from `mkdocs-rss-plugin`; index pages, `tags.md` and `about.md` are excluded by `match_path`.

The sidebar and the section pages are generated from the directory tree (a section `index.md` only provides the title, description and intro paragraph), but the home page is not - link the new file from `docs/index.md`.

## Lint & build

```sh
pre-commit run --all-files
uv run mkdocs build --strict     # warnings are fatal, same as CI
```

The WebP hook converts any staged JPG/PNG under `docs/`, then exits 1 on purpose - re-run
`git commit` to pick up the converted files.

The `check-code-blocks` hook parses every `yaml` and `json` fence in the articles you
changed, and runs `promtool check rules` on the ones that are full Prometheus rule files.
It reports `file:line` for anything a reader could not copy-paste. To keep a deliberately
broken counter-example, put `<!-- check-code-blocks: skip -->` on the line before the
fence.

## Deploy

Push to `master` runs GitHub Actions: lint → build (`mkdocs build --strict`) → deploy
(`mkdocs gh-deploy` onto the `docs` branch, served by GitHub Pages).
Pull requests run lint + build only (no deploy).
Changes limited to repo tooling (`AGENTS.md`, `README.md`, lint and pre-commit config...) skip build and deploy.

## Dependencies

Managed by Renovate. Minor, patch and digest updates automerge once the `build`
check is green; major updates wait for manual review.

## License

[GPL-3.0](LICENSE)
