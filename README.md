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

Push to `master` — GitHub Actions handles lint + deploy automatically.
