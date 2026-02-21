# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal knowledge base / wiki built with **MkDocs Material**, hosted at <https://wiki.jdelgado.fr/> via GitHub Pages. Content is 224+ Markdown files organized by SRE/infra topics.

## Local Development

```bash
# First-time setup
python3 -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt
pre-commit install   # install git hook for markdown linting

# Live preview (hot reload at http://127.0.0.1:8000)
mkdocs serve

# Static build (validates without serving)
mkdocs build --strict
```

## Linting

Pre-commit hooks run `markdownlint-cli2` on changed files. Rules are in `.markdownlint.json`:

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

Push to `master` triggers GitHub Actions (`.github/workflows/main.yml`):

1. Lint job: markdownlint on changed files
2. Deploy job: `mkdocs gh-deploy --force` → pushes built site to `docs` remote branch → GitHub Pages

No manual deploy needed.

## Content Structure

All content lives under `docs/`. Organized by technology domain:

| Directory | Topics |
|-----------|--------|
| `linux/` | fundamentals, security, hosting, monitoring, databases (mysql/postgres/redis/elasticsearch), CLI |
| `kubernetes/` | CLI, deployments, ArgoCD, operators, RKE, Rancher, troubleshooting |
| `cloud/` | AWS, Azure, GCloud |
| `networking/` | Cisco, MikroTik, proof files |
| `docker/`, `gitlab/`, `kafka/` | Container and CI/CD tooling |
| `hardware/` | NIC, HDD, SAN, server |
| `hypervisor/` | ESXi, Proxmox |

Sidebar navigation is **auto-generated** from the `docs/` directory structure (no `nav:` in `mkdocs.yml`).
`docs/index.md` is a hand-maintained landing page TOC — update it when adding new files.

## Commit Convention

Scoped conventional commits following the content path:

```text
type(section/subsection): message
# Examples:
feat(kubernetes/cli): add helm rollback command
fix(linux/security): correct firewall rule syntax
change(cloud/gcloud): add billing export commands
```

## CI Behavior

Deploy job requires lint to pass (`needs: [lint]`).
Lint only runs when `.md` files are changed.
Deploy runs `mkdocs build --strict` before `gh-deploy` — warnings are fatal.

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

## Gotchas

- **External images**: the `privacy` plugin downloads external assets to self-host them.
  A 403/unreachable URL triggers a warning → fatal with `--strict`.
  Always store images locally next to the `.md` file (e.g., `docs/linux/selfhost/koel.jpg`).

- **Shallow clones**: `mkdocs serve` requires full git history due to `git-revision-date-localized`.
  Shallow clones (`--depth 1`) will cause errors. Use `git fetch --unshallow` if needed.
