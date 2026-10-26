"""Own CSS and JS shipped as one minified, fingerprinted file each.

extra_css / extra_javascript in properdocs.yml stay the source list, in cascade order.
The hook concatenates them, minifies, names the result by content hash and points
the config at it: a page loads 2 own files instead of 20, the JS one deferred.
The template CSS (home, category, tags, 404) stays in the bundle on purpose:
navigation.instant keeps the <head>, so a stylesheet linked per template would be
missing after an instant navigation to another template.
"""
import hashlib
import os

import csscompressor
import jsmin
from mkdocs.config.config_options import ExtraScriptValue
from mkdocs.structure.files import File

_bundles = {}
_sources = set()


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
        css = csscompressor.compress(_concat(docs_dir, css_paths, "\n"))
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
