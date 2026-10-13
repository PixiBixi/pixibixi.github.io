"""Expose front matter `variables:` to the client as an inert hidden div (see jd-vars.js)."""

import html as htmllib
import json


def on_page_content(html, page, config, files):
    variables = (page.meta or {}).get("variables")
    if not isinstance(variables, list) or not variables:
        return html
    # A div, not a script: instant navigation drops <script> tags from the swapped content.
    payload = htmllib.escape(json.dumps(variables, ensure_ascii=False), quote=True)
    return html + f'<div id="jd-vars" data-vars="{payload}" hidden></div>'


def on_env(env, config, files):
    from markdown.extensions.toc import slugify

    env.filters["jd_slug"] = lambda value, separator="-": slugify(str(value), separator)
    return env
