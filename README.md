# wiki.jdelgado.fr

Personal knowledge base built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/), hosted at <https://wiki.jdelgado.fr/>.

## Setup

```sh
uv sync
uv run mkdocs serve
```

## Lint

```sh
pre-commit run --all-files
```

## Deploy

Push to `master` runs GitHub Actions: lint → build (`mkdocs build --strict`) → deploy.
Pull requests run lint + build only (no deploy).

## Dependencies

Managed by Renovate. Minor, patch and digest updates automerge once the `build`
check is green; major updates wait for manual review.
