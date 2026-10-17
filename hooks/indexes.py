"""Generated folder index pages and section titles/order.

Every docs folder holding Markdown pages (directly or below) without an
index.md gets a virtual one rendered by overrides/category.html. Nav section
titles come from the folder index H1, else from FOLDER_TITLES, else Title Case.
"""

from __future__ import annotations

import datetime
import logging
import os
import posixpath
from html import escape
import re
import subprocess
import unicodedata
from pathlib import PurePosixPath

import yaml
from mkdocs.structure.files import File, Files
from mkdocs.structure.nav import Navigation, Section
from mkdocs.structure.pages import Page
from mkdocs.utils.meta import get_data

log = logging.getLogger("mkdocs.hooks.indexes")

# Same threshold as article_meta.py: above it a commit is a style sweep.
SWEEP_FILES = 10

# Folders that never become a section, even if they ever hold Markdown.
SKIP_DIRS = {"javascripts", "stylesheets", "img", "assets", "overrides"}

FOLDER_TITLES = {
    "argocd": "ArgoCD",
    "aws": "AWS",
    "bsd": "BSD",
    "centos": "CentOS",
    "check_mk": "Check_MK",
    "ci": "CI",
    "ci-cd": "CI/CD",
    "cli": "CLI",
    "esxi": "ESXi",
    "fibre_optique": "Fibre optique",
    "gcloud": "GCloud",
    "github": "GitHub",
    "gitlab": "GitLab",
    "haproxy": "HAProxy",
    "hdd": "HDD",
    "hp": "HP",
    "ipv6": "IPv6",
    "iterm": "iTerm",
    "lgtm": "LGTM",
    "mac": "macOS",
    "mikrotik": "MikroTik",
    "mongodb": "MongoDB",
    "mpls": "MPLS",
    "mysql": "MySQL",
    "netapp": "NetApp",
    "nginx": "nginx",
    "nic": "NIC",
    "os": "OS",
    "pfsense": "pfSense",
    "postgres": "PostgreSQL",
    "powershell": "PowerShell",
    "rke": "RKE",
    "san": "SAN",
    "systemd": "systemd",
    "wd": "WD",
    "wordpress": "WordPress",
}

# Top-level tab order, as in the design mocks. Unlisted sections go last.
SECTION_ORDER = [
    "linux", "automation", "databases", "monitoring", "kubernetes", "cloud",
    "containers", "ci-cd", "networking", "os", "selfhost", "web", "hardware",
    "hypervisor", "misc",
]

WORDS_PER_MINUTE = 220

_folders: dict[str, dict] = {}
_articles: dict[str, dict] = {}
_virtual: set[str] = set()
# Generated folder index URL -> URL of the only article below it. Recomputed
# every build: a second article turns the folder back into a real category.
_single: dict[str, str] = {}

_HREF = re.compile(r'href="?([^"\s>]+)"?')


def _folder_title(dirname: str) -> str:
    if dirname in FOLDER_TITLES:
        return FOLDER_TITLES[dirname]
    return " ".join(w.capitalize() for w in re.split(r"[-_ ]+", dirname) if w)


def _parent(folder: str) -> str:
    return folder.rsplit("/", 1)[0] if "/" in folder else ""


def _sort_key(text: str) -> str:
    norm = unicodedata.normalize("NFKD", text.casefold())
    return "".join(c for c in norm if not unicodedata.combining(c))


def _git_dates(docs_dir: str) -> dict[str, dict[str, str]]:
    """Per docs-relative path: creation day (renames followed) and last real content change.
    A commit touching more than SWEEP_FILES articles is a style sweep, not an update."""
    try:
        top = subprocess.run(
            ["git", "-C", docs_dir, "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        out = subprocess.run(
            ["git", "-C", top, "log", "--reverse", "-M", "--name-status", "--format=%x00%cs", "--", docs_dir],
            capture_output=True, text=True, check=True,
        ).stdout
    except (OSError, subprocess.CalledProcessError) as exc:
        log.warning("git dates unavailable: %s", exc)
        return {}
    rel_docs = os.path.relpath(os.path.realpath(docs_dir), os.path.realpath(top))

    def rel(path: str) -> str:
        return os.path.relpath(path, rel_docs).replace(os.sep, "/")

    created: dict[str, str] = {}
    updated: dict[str, str] = {}
    for chunk in out.split("\x00")[1:]:
        lines = [x for x in chunk.splitlines() if x]
        day = lines[0]
        entries = [x.split("\t") for x in lines[1:]]
        entries = [e for e in entries if len(e) >= 2 and e[-1].endswith(".md")]
        sweep = len(entries) > SWEEP_FILES
        for e in entries:
            path = rel(e[-1])
            if e[0].startswith("R"):
                old = rel(e[1])
                created[path] = created.pop(old, day)
                if old in updated:
                    updated[path] = updated.pop(old)
            elif e[0] == "A":
                created[path] = day
            if e[0][0] in "AM" and not sweep:
                updated[path] = day
    return {p: {"created": c, "updated": updated.get(p, c)} for p, c in created.items()}


def _read_article(file: File, dates: dict[str, dict[str, str]]) -> dict:
    source = file.content_string
    body, meta = get_data(source)
    title = meta.get("title")
    if not title:
        in_fence = False
        for line in body.splitlines():
            if line.lstrip().startswith(("```", "~~~")):
                in_fence = not in_fence
            elif not in_fence and line.startswith("# "):
                title = line[2:].strip()
                break
    if not title:
        title = _folder_title(PurePosixPath(file.src_uri).stem)
    words = len(body.split())
    known = dates.get(file.src_uri, {})
    date = known.get("updated")
    if not date and file.abs_src_path and os.path.exists(file.abs_src_path):
        date = datetime.date.fromtimestamp(os.path.getmtime(file.abs_src_path)).isoformat()
    tags = meta.get("tags") or []
    return {
        "title": str(title),
        "url": file.url,
        "desc": str(meta.get("description") or ""),
        "tags": [str(t) for t in tags] if isinstance(tags, list) else [str(tags)],
        "min": max(1, round(words / WORDS_PER_MINUTE)),
        "date": date or "",
        "created": known.get("created", date or ""),
    }


def _index_body(folder: str, title: str, files: Files) -> str:
    """Markdown body of a virtual index: H1 + links, kept for search."""
    lines = [f"# {title}", ""]
    for uri in _folders[folder]["articles"]:
        rel = PurePosixPath(uri).relative_to(folder) if folder else PurePosixPath(uri)
        lines.append(f"- [{_articles[uri]['title']}]({rel.as_posix()})")
    for sub in _folders[folder]["subdirs"]:
        lines.append(f"- [{_folders[sub]['title']}]({PurePosixPath(sub).name}/index.md)")
    return "\n".join(lines) + "\n"


def _recursive_articles(folder: str) -> list[str]:
    data = _folders[folder]
    out = list(data["articles"])
    for sub in data["subdirs"]:
        out.extend(_recursive_articles(sub))
    return out


def on_files(files: Files, config) -> Files:
    _folders.clear()
    _articles.clear()
    _virtual.clear()
    _single.clear()
    dates = _git_dates(config["docs_dir"])

    pages = [f for f in files.documentation_pages() if f.src_uri.endswith(".md")]
    for f in pages:
        parts = PurePosixPath(f.src_uri).parts
        if any(p.startswith((".", "_")) or p in SKIP_DIRS for p in parts[:-1]):
            continue
        folder = "/".join(parts[:-1])
        # Register the folder and every ancestor up to the docs root.
        chain = [folder]
        while chain[-1]:
            chain.append(_parent(chain[-1]))
        for d in chain:
            _folders.setdefault(d, {"articles": [], "subdirs": [], "index": None})
        for child, parent in zip(chain, chain[1:]):
            if child not in _folders[parent]["subdirs"]:
                _folders[parent]["subdirs"].append(child)
        if parts[-1] == "index.md":
            _folders[folder]["index"] = f
        else:
            _articles[f.src_uri] = _read_article(f, dates)
            _folders[folder]["articles"].append(f.src_uri)

    for d, data in _folders.items():
        name = PurePosixPath(d).name
        title = None
        if data["index"] is not None:
            title = _read_article(data["index"], dates)["title"]
        data["title"] = title or _folder_title(name)
        data["articles"].sort(key=lambda u: _sort_key(_articles[u]["title"]))
        data["subdirs"].sort(key=lambda s: _sort_key(_folder_title(PurePosixPath(s).name)))

    for d, data in _folders.items():
        if not d or data["index"] is not None:
            continue
        src_uri = f"{d}/index.md"
        total = len(_recursive_articles(d))
        parent_title = _folders[_parent(d)]["title"]
        sample = ", ".join(_articles[u]["title"] for u in _recursive_articles(d)[:4])
        front = {
            "title": data["title"],
            "description": f"{data['title']} ({parent_title}) : {total} article{'s' if total > 1 else ''}. {sample}.",
            "template": "category.html",
            "hide": ["toc"],
        }
        if total == 1:
            front["search"] = {"exclude": True}
        content = "---\n" + yaml.safe_dump(front, allow_unicode=True, sort_keys=False) + "---\n\n" + _index_body(d, data["title"], files)
        vf = File.generated(config, src_uri, content=content)
        files.append(vf)
        data["index"] = vf
        _virtual.add(src_uri)
        if total == 1:
            _single[vf.url] = files.get_file_from_path(_recursive_articles(d)[0]).url
    return files


def on_env(env, config, files: Files):
    env.globals["jd_single"] = _single
    return env


def _resolve(href: str, base: str, site_url: str) -> tuple[str, str] | None:
    """Site-relative URL a link points to, plus its #fragment; None for anything off-site."""
    path, _, frag = href.partition("#")
    if not path:
        return None
    if path.startswith(site_url):
        path = "/" + path[len(site_url):]
    elif re.match(r"^[a-z][a-z0-9+.-]*:", path) or path.startswith("//"):
        return None
    elif not path.startswith("/"):
        path = posixpath.join("/" + base, path)
    norm = posixpath.normpath(path)
    if path.endswith("/") and norm != "/":
        norm += "/"
    return norm.lstrip("/"), frag


def on_post_page(output: str, page: Page, config) -> str:
    """Single-article folders: their page becomes a redirect, every link to them goes to the article."""
    if not _single:
        return output
    site_url = config["site_url"] or ""
    target = _single.get(page.url)
    if target is not None:
        abs_url = site_url + target
        return (
            '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
            f'<title>{escape(page.title or "")}</title><meta name="robots" content="noindex">'
            f'<link rel="canonical" href="{abs_url}"><meta http-equiv="refresh" content="0; url={abs_url}">'
            f'</head><body><a href="{abs_url}">{abs_url}</a></body></html>'
        )
    base = page.url if page.url.endswith("/") or not page.url else posixpath.dirname(page.url) + "/"

    def swap(m: re.Match) -> str:
        hit = _resolve(m.group(1), base, site_url)
        if hit is None or hit[0] not in _single:
            return m.group(0)
        article = _single[hit[0]]
        if article == page.url:
            return "data-jd-self"
        rel = posixpath.relpath("/" + article, "/" + base) + "/"
        return f'href="{rel}"'

    return _HREF.sub(swap, output)


def _context(folder: str) -> dict:
    data = _folders[folder]
    parent = _parent(folder)
    crumbs = []
    walk = parent
    while walk:
        crumbs.insert(0, {"title": _folders[walk]["title"], "url": _folders[walk]["index"].url})
        walk = _parent(walk)

    def card(uri: str) -> dict:
        return dict(_articles[uri])

    def recent_first(uris: list[str]) -> list[str]:
        by_title = sorted(uris, key=lambda u: _sort_key(_articles[u]["title"]))
        return sorted(by_title, key=lambda u: _articles[u]["date"] or "", reverse=True)

    subs = []
    for s in data["subdirs"]:
        items = recent_first(_recursive_articles(s))
        subs.append({
            "id": PurePosixPath(s).name,
            "title": _folders[s]["title"],
            "url": _folders[s]["index"].url,
            "articles": [card(u) for u in items],
        })

    every = _recursive_articles(folder)
    counts: dict[str, int] = {}
    for u in every:
        for t in _articles[u]["tags"]:
            counts[t] = counts.get(t, 0) + 1
    # A tag carried by every article filters nothing: no chip for it.
    useful = [kv for kv in counts.items() if kv[1] < len(every)]
    chips = sorted(useful, key=lambda kv: (-kv[1], _sort_key(kv[0])))[:6]

    siblings = []
    if parent:
        siblings = [
            {"title": _folders[s]["title"], "url": _folders[s]["index"].url}
            for s in _folders[parent]["subdirs"] if s != folder
        ]
    return {
        "crumbs": crumbs,
        "total": len(every),
        "updated": max((_articles[u]["date"] for u in every), default=""),
        "articles": [card(u) for u in recent_first(data["articles"])],
        "subfolders": subs,
        "chips": [{"name": n, "n": c} for n, c in chips],
        "parent_title": _folders[parent]["title"] if parent else "",
        "siblings": siblings,
    }


def on_page_markdown(markdown: str, page: Page, config, files: Files) -> str:
    src = page.file.src_uri
    if src in _virtual:
        page.meta["jd_cat"] = _context(_parent(src))
        # Runs after the meta plugin (50) and before tags (-50): directory
        # tags would list every category page in the tags index.
        page.meta["tags"] = []
    elif src.count("/") == 1 and src.endswith("/index.md"):
        # Hand-written section index: keep its intro, the article list comes
        # from the folder like a generated one (its "## Contenus" is dropped).
        page.meta["jd_cat"] = dict(_context(_parent(src)), intro=True)
        page.meta["template"] = "category.html"
        page.meta["hide"] = ["toc"]
        page.meta.setdefault("title", _folders[_parent(src)]["title"])
        intro = markdown.split("\n## ", 1)[0]
        return re.sub(r"^# .*$", "", intro, count=1, flags=re.M)
    return markdown


def _section_dir(section: Section) -> str | None:
    for child in section.children:
        if isinstance(child, Page):
            return _parent(child.file.src_uri)
        if isinstance(child, Section):
            sub = _section_dir(child)
            if sub is not None:
                return _parent(sub)
    return None


def _retitle(items: list) -> None:
    for item in items:
        if isinstance(item, Section):
            d = _section_dir(item)
            if d in _folders:
                item.title = _folders[d]["title"]
            _retitle(item.children)


def on_nav(nav: Navigation, config, files: Files) -> Navigation:
    _retitle(nav.items)

    def rank(item) -> tuple[int, int]:
        if isinstance(item, Section):
            d = _section_dir(item) or ""
            name = d.split("/")[0]
            pos = SECTION_ORDER.index(name) if name in SECTION_ORDER else len(SECTION_ORDER)
            return (1, pos)
        if isinstance(item, Page) and item.is_homepage:
            return (0, 0)
        return (2, 0)

    nav.items.sort(key=rank)

    pages: list[Page] = []

    def collect(items: list) -> None:
        for item in items:
            if isinstance(item, Page):
                pages.append(item)
            if item.children:
                collect(item.children)

    collect(nav.items)
    nav.pages = pages
    # Single-article folder pages are redirects: keep them out of prev/next.
    chain = [p for p in pages if p.url not in _single]
    for prev, cur, nxt in zip([None, *chain[:-1]], chain, [*chain[1:], None]):
        cur.previous_page, cur.next_page = prev, nxt
    return nav
