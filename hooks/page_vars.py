"""Expose front matter `variables:` to the client as an inert JSON script (see jd-vars.js)."""

import json


def on_page_content(html, page, config, files):
    variables = (page.meta or {}).get("variables")
    if not isinstance(variables, list) or not variables:
        return html
    payload = json.dumps(variables, ensure_ascii=False).replace("<", "\\u003c")
    return html + f'<script type="application/json" id="jd-vars">{payload}</script>'


def on_env(env, config, files):
    from markdown.extensions.toc import slugify

    env.filters["slugify"] = lambda value, separator="-": slugify(str(value), separator)
    return env
