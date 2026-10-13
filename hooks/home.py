"""Data for the home page and the tags index (templates: home.html, tags.html)."""

import re
import subprocess
from collections import defaultdict

from pymdownx.slugs import slugify

_SECTION_TITLES = {"ci-cd": "CI/CD", "os": "OS"}
_CASE = {
    "cli": "CLI", "bsd": "BSD", "centos": "CentOS", "argocd": "ArgoCD", "haproxy": "HAProxy", "mysql": "MySQL",
    "gcloud": "GCloud", "aws": "AWS", "esxi": "ESXi", "hdd": "HDD", "nic": "NIC", "san": "SAN", "lgtm": "LGTM",
    "github": "GitHub", "gitlab": "GitLab", "pfsense": "pfSense", "mikrotik": "MikroTik", "nginx": "nginx",
    "mongodb": "MongoDB", "postgres": "Postgres", "elasticsearch": "Elasticsearch", "check mk": "check_mk",
    "mac": "macOS", "ci/cd": "CI/CD", "os": "OS",
}
_TAG_MIN = 4
_slug = slugify(case="lower")
_created = {}


def _creation_dates():
    """Docs-relative path -> ISO date of the first commit, one git call, renames followed."""
    if _created:
        return _created
    out = subprocess.run(
        ["git", "log", "--reverse", "-M", "--name-status", "--format=@@%aI", "--", "docs"],
        capture_output=True, text=True, check=False,
    ).stdout
    date = ""
    for line in out.splitlines():
        if line.startswith("@@"):
            date = line[2:12]
            continue
        parts = line.split("\t")
        if len(parts) == 2 and parts[0] == "A":
            _created[parts[1].removeprefix("docs/")] = date
        elif len(parts) == 3 and parts[0].startswith("R"):
            old, new = parts[1].removeprefix("docs/"), parts[2].removeprefix("docs/")
            _created[new] = _created.get(old, date)
    return _created


def _walk(items):
    for item in items:
        if item.is_page:
            yield item
        elif item.is_section:
            yield from _walk(item.children)


def _articles(nav):
    skip = ("about.md", "tags.md")
    return [p for p in _walk(nav.items) if p.file.name != "index" and p.file.src_uri not in skip]


def _short(title):
    return re.split(r"\s+[:\-]\s+|:\s", title, maxsplit=1)[0].strip()


def _label(title):
    low = title.lower().replace("-", " ")
    return _CASE.get(low, _SECTION_TITLES.get(low.replace(" ", "-"), title))


def _top(page):
    while page.parent and page.parent.parent:
        page = page.parent
    return page.parent


def _section(section):
    pages = [p for p in _walk(section.children) if p.file.name != "index"]
    subs = [c for c in section.children if c.is_section]
    names = [_label(_short(s.title)) for s in subs]
    if len(names) < 3:
        names += [t for t in (_short(p.title) for p in section.children if p.is_page and p.file.name != "index") if len(t) <= 22]
    index = getattr(section, "index_page", None) or (pages[0] if pages else None)
    return {
        "name": _label(section.title),
        "count": len(pages),
        "topics": ", ".join(names[:5]),
        "url": index.url if index else "",
    }


def on_page_context(context, page, config, nav):
    src = page.file.src_uri
    if src not in ("index.md", "tags.md"):
        return context
    articles = _articles(nav)
    dates = _creation_dates()
    newest = sorted(articles, key=lambda p: dates.get(p.file.src_uri, ""), reverse=True)

    if src == "index.md":
        sections = [_section(s) for s in nav.items if s.is_section]
        context["jd_home"] = {
            "total": len(articles),
            "sections": sorted(sections, key=lambda s: -s["count"]),
            "recent": [
                {
                    "date": dates.get(p.file.src_uri, ""),
                    "section": _label(_top(p).title) if _top(p) else "",
                    "title": p.title,
                    "url": p.url,
                }
                for p in newest[:6]
            ],
        }
        return context

    by_tag = defaultdict(list)
    for p in newest:
        for tag in dict.fromkeys(str(x) for x in (p.meta.get("tags") or [])):
            by_tag[tag].append(p)
    # Every tag, even under _TAG_MIN, gets a panel: article pills link to tags/#tag:<slug>.
    tags = [
        {
            "name": n,
            "n": len(ps),
            "ex": [x.title for x in ps[:3]],
            "slug": _slug(n, "-"),
            "pages": [
                {
                    "title": x.title,
                    "url": x.url,
                    "section": _label(_top(x).title) if _top(x) else "",
                    "desc": str(x.meta.get("description") or ""),
                }
                for x in sorted(ps, key=lambda x: x.title.lower())
            ],
        }
        for n, ps in by_tag.items()
    ]
    popular = sorted(tags, key=lambda t: (-t["n"], t["name"].lower()))
    shown = [t for t in popular if t["n"] >= _TAG_MIN]
    groups = defaultdict(list)
    for t in sorted(shown, key=lambda t: t["name"].lower()):
        groups[t["name"][0].upper()].append(t)
    context["jd_tags"] = {
        "total": len(tags),
        "articles": len(articles),
        "featured": popular[:12],
        "shown": len(shown),
        "popular": shown,
        "all": sorted(tags, key=lambda t: t["name"].lower()),
        "groups": [{"letter": k, "tags": v} for k, v in groups.items()],
    }
    return context
