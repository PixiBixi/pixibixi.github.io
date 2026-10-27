"""Own CSS and JS shipped as one minified, fingerprinted file each.

extra_css / extra_javascript in properdocs.yml stay the source list, in cascade order.
The hook concatenates them, minifies, names the result by content hash and points
the config at it: a page loads 2 own files instead of 20, the JS one deferred.
The template CSS (home, category, tags, 404) stays in the bundle on purpose:
navigation.instant keeps the <head>, so a stylesheet linked per template would be
missing after an instant navigation to another template.

The theme palette and the glightbox stylesheet go in the same CSS bundle, at their
original place in the cascade, and glightbox.min.js is deferred: each was a
render-blocking request of its own in the <head>.
"""
import glob
import hashlib
import os
import re

import csscompressor
import jsmin
import mkdocs_glightbox
from mkdocs.config.config_options import ExtraScriptValue
from mkdocs.structure.files import File

_bundles = {}
_sources = set()

_PALETTE_LINK = re.compile(r'<link rel="?stylesheet"? href="?[^\s">]*assets/stylesheets/palette\.[0-9a-f]+\.min\.css"?>')
_GLIGHTBOX_LINK = re.compile(r'<link href="?[^\s">]*assets/stylesheets/glightbox\.min\.css"? rel="?stylesheet"?>')
_GLIGHTBOX_JS = re.compile(r'(<script src="?[^\s">]*assets/javascripts/glightbox\.min\.js"?)>')
_GLIGHTBOX_INIT = re.compile(r'(<script id="?init-glightbox"?>)(.*?)(</script>)', re.S)


def _read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def _palette(config):
    # The file name carries the theme's own hash: look it up instead of pinning it.
    for theme_dir in config["theme"].dirs:
        found = glob.glob(os.path.join(theme_dir, "assets/stylesheets/palette.*.min.css"))
        if found:
            return _read(found[0])
    raise FileNotFoundError("palette stylesheet not found in the theme dirs")


def _concat(docs_dir, paths, sep):
    parts = []
    for path in paths:
        with open(os.path.join(docs_dir, path), encoding="utf-8") as fh:
            parts.append(fh.read())
    return sep.join(parts)


def _name(stem, ext, content):
    return f"{stem}.{hashlib.sha256(content.encode('utf-8')).hexdigest()[:8]}.{ext}"


def on_config(config):
    _bundles.clear()
    _sources.clear()
    docs_dir = config["docs_dir"]

    css_paths = [str(p) for p in config["extra_css"]]
    if css_paths:
        glightbox_css = _read(os.path.join(os.path.dirname(mkdocs_glightbox.__file__), "glightbox", "glightbox.min.css"))
        # Same order as the <link>s they replace: palette before the own CSS, glightbox after.
        css = csscompressor.compress("\n".join([_palette(config), _concat(docs_dir, css_paths, "\n"), glightbox_css]))
        uri = _name("stylesheets/bundle", "css", css)
        _bundles[uri] = css
        config["extra_css"] = [uri]

    js_paths = [str(s) for s in config["extra_javascript"]]
    if js_paths:
        # Every script is an IIFE: the ";" guards the concatenation all the same.
        js = jsmin.jsmin(_concat(docs_dir, js_paths, "\n;\n"), quote_chars="'\"`")
        uri = _name("javascripts/bundle", "js", js)
        _bundles[uri] = js
        script = ExtraScriptValue(uri)
        script.defer = True
        config["extra_javascript"] = [script]

    _sources.update(css_paths + js_paths)
    return config


def on_files(files, config):
    for path in _sources:
        source = files.get_file_from_path(path)
        if source:
            files.remove(source)
    for uri, content in _bundles.items():
        files.append(File.generated(config, uri, content=content))
    return files


def on_post_page(output, page, config):
    # Hooks run after the plugins: glightbox has injected its tags, minify has unquoted them.
    output = _PALETTE_LINK.sub("", output, count=1)
    output = _GLIGHTBOX_LINK.sub("", output, count=1)
    # The deferred library is not there yet when the inline init runs: defer only once the init waits for it.
    output, wrapped = _GLIGHTBOX_INIT.subn(
        lambda m: f'{m[1]}document.addEventListener("DOMContentLoaded",()=>{{{m[2]}}});{m[3]}', output, count=1
    )
    if wrapped:
        output = _GLIGHTBOX_JS.sub(r"\1 defer>", output, count=1)
    return output
