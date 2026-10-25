"""Page dates for document-dates, and the jd_date filter that prints them.

document-dates takes the creation date from the first commit of the current path, so a
renamed article looks brand new. This hook hands it the rename-followed date as front
matter `created` (an explicit one in the page wins), before the plugin reads it.
"""
import subprocess
from datetime import datetime, timezone

from babel.dates import format_date
from mkdocs.plugins import event_priority

_created = {}
_locale = "fr"
_ASSETS = "assets/document_dates/"


def on_config(config):
    global _locale
    _locale = config.theme.get("language") or "fr"
    # The plugin's own block is off: drop the 14 stylesheets and scripts it links on every page.
    config["extra_css"] = [e for e in config["extra_css"] if not str(e).startswith(_ASSETS)]
    config["extra_javascript"] = [e for e in config["extra_javascript"] if not str(e).startswith(_ASSETS)]
    _created.clear()
    out = subprocess.run(
        ["git", "log", "--reverse", "-M", "--name-status", "--format=@@%aI", "--", "docs"],
        capture_output=True, text=True, check=False,
    ).stdout
    date = ""
    for line in out.splitlines():
        if line.startswith("@@"):
            date = line[2:]
            continue
        parts = line.split("\t")
        if len(parts) == 2 and parts[0] == "A":
            _created[parts[1].removeprefix("docs/")] = date
        elif len(parts) == 3 and parts[0].startswith("R"):
            old, new = parts[1].removeprefix("docs/"), parts[2].removeprefix("docs/")
            _created[new] = _created.get(old, date)


# Before document-dates (priority 50), which reads `created` from the front matter.
@event_priority(60)
def on_page_markdown(markdown, page, config, files):
    created = _created.get(page.file.src_uri)
    if created and "created" not in page.meta:
        page.meta["created"] = created
    return markdown


def _utc(value):
    return datetime.fromisoformat(value).astimezone(timezone.utc)


def on_env(env, config, files):
    # "2026-10-13T14:01:46+02:00" -> "13 octobre 2026" ("long"), or "2026-10-13" ("iso"), in UTC.
    def jd_date(value, fmt="long"):
        if not value:
            return ""
        day = _utc(value).date()
        return day.isoformat() if fmt == "iso" else format_date(day, format=fmt, locale=_locale)

    env.filters["jd_date"] = jd_date
    return env
