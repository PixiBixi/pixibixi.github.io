"""Theme UI strings: overrides/i18n/<theme.language>.yml, English as fallback.

Templates read them through lang.t() (see overrides/partials/language.html),
scripts through window.jdI18n set in main.html.
"""
import os

import yaml


def _load(path):
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def on_env(env, config, files):
    base = os.path.join(config["theme"].custom_dir, "i18n")
    strings = {**_load(os.path.join(base, "en.yml")), **_load(os.path.join(base, f"{config['theme']['language']}.yml"))}
    env.globals["jd_i18n"] = strings
    env.globals["jd_t"] = lambda key: strings.get(key, "")
    return env
