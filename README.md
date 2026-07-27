# wiki.jdelgado.fr

[![ci](https://github.com/PixiBixi/pixibixi.github.io/actions/workflows/main.yml/badge.svg)](https://github.com/PixiBixi/pixibixi.github.io/actions/workflows/main.yml)

Personal knowledge base built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/), hosted at <https://wiki.jdelgado.fr/>.
240+ French articles on Linux, Kubernetes, cloud, networking, databases and monitoring.

## Setup

Needs [uv](https://docs.astral.sh/uv/), plus `pre-commit` and `cwebp` on the `PATH`
(`brew install pre-commit webp`) — neither is pulled in by `uv sync`.

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

The sidebar is generated from the directory tree, but the landing pages are not — link the
new file from `docs/index.md` **and** `docs/<section>/index.md`.

## Lint & build

```sh
pre-commit run --all-files
uv run mkdocs build --strict     # warnings are fatal, same as CI
```

The WebP hook converts any staged JPG/PNG under `docs/`, then exits 1 on purpose — re-run
`git commit` to pick up the converted files.

## Deploy

Push to `master` runs GitHub Actions: lint → build (`mkdocs build --strict`) → deploy
(`mkdocs gh-deploy` onto the `docs` branch, served by GitHub Pages).
Pull requests run lint + build only (no deploy).

## Dependencies

Managed by Renovate. Minor, patch and digest updates automerge once the `build`
check is green; major updates wait for manual review.

## License

[GPL-3.0](LICENSE)
