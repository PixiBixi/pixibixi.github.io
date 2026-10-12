"""Article-level metadata: reading time, series, backlinks.

Everything is computed once in on_files (one read per Markdown file), then
attached to page.meta in on_page_markdown for the templates.
"""
import datetime
import json
import os
import posixpath
import re
from urllib.parse import unquote

import yaml
from markdown.extensions.toc import slugify

WPM = 220
CONTEXT_WORDS = 20
FENCE = re.compile(r"^(\s*)(```|~~~).*?^\1\2[ \t]*$", re.S | re.M)
FRONT = re.compile(r"\A---\n(.*?)\n---\n", re.S)
LINK = re.compile(r"(?<!!)\[((?:[^\[\]]|\[[^\]]*\])+)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
H1 = re.compile(r"^#\s+(.+?)\s*$", re.M)
ATTR = re.compile(r"\s*\{[^}]*\}\s*$")

_data = {"reading": {}, "series": {}, "backlinks": {}}
_descriptions = {}
_articles = []


def _plain(text):
    """Strip inline Markdown down to readable text."""
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[`*_]{1,3}", "", text)
    return re.sub(r"\s+", " ", text).strip()


LISTISH = re.compile(r"^\s*(?:[-*+]\s|\d+[.)]\s|\||>)")
BOUNDARY = re.compile(r"[.!?](?:\s|$)")


def _snippet(plain, s, e):
    """Sentence around the marked link, trimmed to CONTEXT_WORDS on each side when too long."""
    start = 0
    for m in BOUNDARY.finditer(plain, 0, s):
        start = m.end()
    m = BOUNDARY.search(plain, e + 1)
    end = m.start() + 1 if m else len(plain)
    before, after = plain[start:s].lstrip(), plain[e + 1 : end].rstrip()
    lead = trail = False
    words = before.split(" ")
    if len(words) > CONTEXT_WORDS:
        before, lead = " ".join(words[-CONTEXT_WORDS:]) + " ", True
    words = after.split(" ")
    if len(words) > CONTEXT_WORDS:
        after, trail = " ".join(words[:CONTEXT_WORDS]).rstrip(" ,;:(-"), True
    return before, after, lead, trail


def _best(cites):
    """First prose citation with some text around the link, else the first one that has any."""
    for ok in (lambda c: c["prose"] and (c["before"] or c["after"]), lambda c: c["before"] or c["after"]):
        hit = next((c for c in cites if ok(c)), None)
        if hit:
            return hit
    return cites[0]


def on_files(files, config):
    _descriptions.clear()
    _articles.clear()
    docs = {}
    for f in files.documentation_pages():
        # Folder indexes from hooks/indexes.py have no source file and are never backlink sources.
        if f.abs_src_path is None:
            continue
        raw = open(f.abs_src_path, encoding="utf-8").read()
        meta = {}
        m = FRONT.match(raw)
        if m:
            try:
                meta = yaml.safe_load(m.group(1)) or {}
            except yaml.YAMLError:
                meta = {}
            raw = raw[m.end():]
        h1 = H1.search(FENCE.sub("", raw))
        title = meta.get("title") or (_plain(h1.group(1)) if h1 else f.src_uri)
        docs[f.src_uri] = {"meta": meta, "body": raw, "title": title, "url": f.url}

    reading, series, backlinks = {}, {}, {}
    for uri, d in docs.items():
        # Code fences are excluded: they are scanned, not read word by word
        words = len(re.findall(r"\w+", FENCE.sub("", d["body"])))
        reading[uri] = max(1, round(words / WPM))
        name = d["meta"].get("series")
        if name:
            series.setdefault(name, []).append(
                (d["meta"].get("series_order", 999), uri, d["title"], d["url"])
            )
    for items in series.values():
        items.sort()

    for uri, d in docs.items():
        # Landing pages (home, section indexes) are not sources
        if uri == "index.md" or posixpath.basename(uri) == "index.md":
            continue
        body = FENCE.sub(lambda m: "\n" * m.group(0).count("\n"), d["body"])
        section = None
        for para in re.split(r"\n\s*\n", body):
            first = para.lstrip().splitlines()[0] if para.strip() else ""
            if first.startswith("## "):
                section = ATTR.sub("", first[3:]).strip()
            # Lists and tables are cited line by line (prose=False), paragraphs as a whole.
            prose = not LISTISH.match(first)
            units = [para] if prose else para.splitlines()
            for unit in units:
                for m in LINK.finditer(unit):
                    target = unquote(m.group(2)).split("#")[0]
                    if not target or re.match(r"^[a-z]+:", target) or not target.endswith(".md"):
                        continue
                    dest = posixpath.normpath(posixpath.join(posixpath.dirname(uri), target))
                    if dest == uri or dest not in docs:
                        continue
                    if not prose:
                        # Keep only the table cell or list item holding the link, without its marker.
                        pre, post = unit[: m.start()], unit[m.end():]
                        pre = pre.rsplit("|", 1)[-1]
                        post = post.split("|", 1)[0]
                        unit_m = re.sub(r"^\s*(?:[-*+]|\d+[.)]|>)\s+", "", pre) + "\x02" + m.group(1) + "\x03" + post
                    else:
                        unit_m = unit[: m.start()] + "\x02" + m.group(1) + "\x03" + unit[m.end():]
                    # Flatten the other links/formatting but keep the markers
                    plain = _plain(unit_m)
                    sm, em = plain.find("\x02"), plain.find("\x03")
                    if sm < 0 or em < 0:
                        continue
                    before, after, lead, trail = _snippet(plain, sm, em)
                    backlinks.setdefault(dest, {}).setdefault(uri, []).append({
                        "title": d["title"],
                        "url": d["url"],
                        "where": section,
                        "anchor_id": slugify(section, "-") if section else None,
                        "before": before,
                        "anchor": _plain(plain[sm + 1 : em]),
                        "after": after,
                        "lead": lead,
                        "trail": trail,
                        "prose": prose,
                    })
    # One entry per source page (first citation), stable order by title
    _data["reading"], _data["series"] = reading, series
    _data["backlinks"] = {
        dest: sorted((_best(v) for v in srcs.values()), key=lambda b: b["title"].lower())
        for dest, srcs in backlinks.items()
    }
    return files


def on_page_markdown(markdown, page, config, files):
    uri = page.file.src_uri
    page.meta["reading_time"] = _data["reading"].get(uri, 1)
    name = page.meta.get("series")
    if name and name in _data["series"]:
        items = _data["series"][name]
        idx = next((i for i, it in enumerate(items) if it[1] == uri), None)
        if idx is not None:
            page.meta["series_box"] = {
                "name": name,
                "position": idx + 1,
                "total": len(items),
                "items": [{"title": t, "url": u, "current": i == idx} for i, (_, _, t, u) in enumerate(items)],
                "next": ({"title": items[idx + 1][2], "url": items[idx + 1][3]} if idx + 1 < len(items) else None),
            }
    page.meta["backlinks"] = _data["backlinks"].get(uri, [])
    if page.file.name != "index" and uri not in ("about.md", "tags.md"):
        _articles.append(page.url)
    if page.meta.get("description"):
        _descriptions[page.url] = str(page.meta["description"])
    return markdown


def on_page_context(context, page, config, nav):
    # The revision date is set by the revision-date plugin, which only has it once markdown is done.
    raw = page.meta.get("git_revision_date_localized_raw_iso_date")
    if raw and page.file.name != "index" and page.file.src_uri not in ("about.md", "tags.md"):
        try:
            age = datetime.date.today() - datetime.date.fromisoformat(str(raw)[:10])
        except ValueError:
            return context
        page.meta["outdated"] = age.days > 730
    return context


def on_post_build(config):
    # Read by the 404 suggestions and the palette counts: the search index has no front matter nor page kind.
    out = os.path.join(config["site_dir"], "search", "jd-pages.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"descriptions": _descriptions, "articles": sorted(set(_articles))}, fh, ensure_ascii=False, separators=(",", ":"))
