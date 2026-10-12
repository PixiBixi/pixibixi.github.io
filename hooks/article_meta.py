"""Article-level metadata: reading time, series, backlinks.

Everything is computed once in on_files (one read per Markdown file), then
attached to page.meta in on_page_markdown for the templates.
"""
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


def _plain(text):
    """Strip inline Markdown down to readable text."""
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[`*_]{1,3}", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _words_around(text, marker_start, marker_end):
    before = text[:marker_start].split()[-CONTEXT_WORDS:]
    after = text[marker_end:].split()[:CONTEXT_WORDS]
    return " ".join(before), " ".join(after)


def on_files(files, config):
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
            for m in LINK.finditer(para):
                target = unquote(m.group(2)).split("#")[0]
                if not target or re.match(r"^[a-z]+:", target) or not target.endswith(".md"):
                    continue
                dest = posixpath.normpath(posixpath.join(posixpath.dirname(uri), target))
                if dest == uri or dest not in docs:
                    continue
                marked = para[: m.start()] + "\x00" + m.group(1) + "\x01" + para[m.end():]
                # Flatten the other links/formatting but keep the markers
                plain = _plain(marked.replace("\x00", "\x02").replace("\x01", "\x03"))
                s, e = plain.find("\x02"), plain.find("\x03")
                if s < 0 or e < 0:
                    continue
                before, after = _words_around(plain, s, e + 1)
                backlinks.setdefault(dest, {}).setdefault(uri, []).append({
                    "title": d["title"],
                    "url": d["url"],
                    "where": section,
                    "anchor_id": slugify(section, "-") if section else None,
                    "before": before,
                    "anchor": _plain(plain[s + 1 : e]),
                    "after": after,
                })
    # One entry per source page (first citation), stable order by title
    _data["reading"], _data["series"] = reading, series
    _data["backlinks"] = {
        dest: sorted((v[0] for v in srcs.values()), key=lambda b: b["title"].lower())
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
    if page.meta.get("description"):
        _descriptions[page.url] = str(page.meta["description"])
    return markdown


def on_post_build(config):
    # Read by the 404 suggestions (pages.js): the search index carries no front matter.
    out = os.path.join(config["site_dir"], "search", "descriptions.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(_descriptions, fh, ensure_ascii=False, separators=(",", ":"))
