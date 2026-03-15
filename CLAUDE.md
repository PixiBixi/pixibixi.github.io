# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal knowledge base / wiki built with **MkDocs Material**, hosted at <https://wiki.jdelgado.fr/> via GitHub Pages. Content is 224+ Markdown files organized by SRE/infra topics.

## Local Development

```bash
# First-time setup
uv sync
pre-commit install   # install git hook for markdown linting

# Live preview (hot reload at http://127.0.0.1:8000)
uv run mkdocs serve

# Static build (validates without serving)
uv run mkdocs build --strict
```

## Linting

- **Inline disable/enable**: always specify rule names (e.g. `MD046`).
  A bare `markdownlint-enable` without rule names re-enables ALL rules,
  overriding `.markdownlint.json` globals (including MD013).

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
| `linux/` | fundamentals, security, hosting (nginx, haproxy, lemp), CLI, shell, storage, systemd |
| `automation/` | Ansible, Terraform, Makefile |
| `databases/` | MySQL, Postgres, Redis, Elasticsearch, Memcached |
| `monitoring/` | LGTM stack, check_mk, Munin |
| `kubernetes/` | CLI, deployments, ArgoCD, operators, RKE, Rancher, troubleshooting |
| `cloud/` | AWS, Azure, GCloud |
| `containers/` | Docker, Kafka |
| `ci-cd/` | GitLab |
| `networking/` | Cisco, MikroTik, pfSense |
| `os/` | macOS, Windows, misc desktop |
| `selfhost/` | Self-hosted apps (Nextcloud, Koel, etc.) |
| `web/` | nginx, HAProxy, Varnish, DNS, mail, WordPress |
| `hardware/` | NIC, HDD, SAN, server |
| `hypervisor/` | ESXi, Proxmox |
| `ssh/` | SSH config and tips |

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

## Content Language

All article content is written in **French**. This overrides the global
English rule. Code, commands, and commit messages stay in English.

## Before committing

Always run `mkdocs build --strict` before committing file renames or new articles:

```bash
uv run mkdocs build --strict 2>&1 | grep -E "WARNING|ERROR"
```

`index.md` contains hardcoded links — renames break the build silently until CI catches it.

## Article Writing Style

> ⚠️ These rules apply to **short reference articles**. For full tutorials (step-by-step
> install guides, multi-section walkthroughs), preserve pedagogical content:
> Lexique sections, concept explanations, and intro context — they are intentional.

- Short punchy intro — 1-3 sentences, blunt observation ("c'est la galère", "c'est pas génial")
- Use "on" throughout, not "vous" or passive
- Skip concept explanations — jump straight to how
- Minimal admonitions, only for truly critical warnings
- Bullet lists over tables when possible
- No "## Prérequis" or "## Conclusion" sections
- Stop when content is done, no wrap-up paragraph
- **Never use ASCII box diagrams** (┌─┐│└─┘) — looks AI-generated
- No exhaustive warning/tip boxes on every section

Language patterns:

- Prefer "sont" over "c'est des": "Les Spot VMs sont des instances..." not "c'est des instances..."
- No formal French technical vocabulary → plain language
- Mix English tech terms naturally in French: "inmaintenable at scale", `rotate` as a verb
- **Never translate K8s/infra nouns**: registry, policy, limits, requests, namespace, label, binding — always left in English in French prose
- Use numbers at sentence start: "2 solutions s'offrent ici à nous..."
- Present alternatives explicitly: "on fait X ou on fait Y"
- Trailing `...` to cut a sentence short
- Prefer ratio/multiplier over percentages: "gain entre 4-5x" not "60% moins cher"
- **Always add a sentence before a code block** — a section title followed directly by a code block with no context feels abrupt
- **Avoid `—` as a connector in flowing sentences** — feels AI-generated, prefer "which is", "so", or rephrase
- **Avoid meta-technical phrasing** : "the API changed completely compared to v2" → rephrase naturally ("no more `source vars`, it doesn't work anymore")

## Article Rewrite Workflow

When rewriting an article:

1. Read the existing file first
2. Fetch external sources if needed (dotfiles repo, upstream docs)
3. Write: practical examples, real-world use cases — commands copy-pasteable on the spot
4. **Update `docs/index.md`** if it's a new file — hardcoded links, always
5. Lint: `markdownlint-cli2 "path/to/file.md"`
6. Preview: run `mkdocs serve --dirty` (background) and open the article in the browser
   - URL pattern: `http://127.0.0.1:8000/<path-without-docs-prefix-and-md>/`
   - Example: `docs/linux/cli/sed.md` → `open http://127.0.0.1:8000/linux/cli/sed/`
7. Commit + push — CI validates automatically

After writing, add YAML front matter to the article:

```yaml
---
description: One-line description of the article (used for SEO).
tags:
  - RelevantTag
---
```

Directory-level tags come from `.meta.yml` files — add per-article tags
that are more specific than the directory defaults.

## Gotchas

- **SVG diagrams — taille rendue**: un SVG scale à la largeur du contenu (~750px). La hauteur
  rendue = viewBox_height × (750 / viewBox_width). Préférer un layout horizontal pour les
  diagrammes séquentiels — un viewBox 580×110 donne ~143px de haut, un 520×390 donne ~563px.

- **Blocs YAML fragmentés**: plusieurs petits blocs montrant le même pattern (ex: même annotation
  sur 3 ressources différentes) → fusionner en un seul bloc avec `---` comme séparateur.

- **External images**: the `privacy` plugin downloads external assets to self-host them.
  A 403/unreachable URL triggers a warning → fatal with `--strict`.
  Always store images locally next to the `.md` file (e.g., `docs/linux/selfhost/koel.jpg`).

- **SVG diagrams**: store in `docs/<section>/_img/<name>.svg` — run `mkdir -p` first as the dir may not exist. Reference with `![](./_img/name.svg)` — Glightbox applies automatically.

- **Shallow clones**: `mkdocs serve` requires full git history due to `git-revision-date-localized`.
  Shallow clones (`--depth 1`) will cause errors. Use `git fetch --unshallow` if needed.
