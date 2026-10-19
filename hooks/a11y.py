"""Accessible names for the line-number links of code blocks.

pymdownx.highlight draws the number with CSS (data-linenos), so the link has no
text and fails Lighthouse's link-name audit. The label is jd.code.line, read from
overrides/i18n/ here: page content is rendered before on_env, so jd_t is not set yet.
"""
import os
import re

import yaml

_LINK = re.compile(r'<a href="#__codelineno-([\w-]+?)-(\d+)">')
_label = "Line {n}"


def on_config(config):
    global _label
    path = os.path.join(config["theme"].custom_dir, "i18n", f"{config['theme']['language']}.yml")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            _label = (yaml.safe_load(fh) or {}).get("jd.code.line", _label)
    return config


def on_page_content(html, page, config, files):
    return _LINK.sub(
        lambda m: f'<a href="#__codelineno-{m[1]}-{m[2]}" aria-label="{_label.replace("{n}", m[2])}">',
        html,
    )
