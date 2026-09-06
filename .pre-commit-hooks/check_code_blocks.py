#!/usr/bin/env python3
"""Validate fenced code blocks in changed Markdown files.

Catches snippets a reader would copy-paste and that cannot work: YAML that
does not parse, JSON fragments missing their enclosing object, Prometheus
rule files rejected by promtool.

Prose is not checked, only what sits inside a fence. To skip one block on
purpose (a deliberate counter-example), put this on the line before it:

    <!-- check-code-blocks: skip -->
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

import yaml

FENCE = re.compile(
    r"^(?P<indent>[ \t]*)```(?P<info>[^\n]*)\n(?P<body>.*?)^(?P=indent)```",
    re.DOTALL | re.MULTILINE,
)
SKIP_MARKER = "check-code-blocks: skip"


def is_prometheus_rules(doc: object) -> bool:
    """A full rule file, not a fragment: groups -> [{rules: [...]}]."""
    if not isinstance(doc, dict) or not isinstance(doc.get("groups"), list):
        return False
    return any(isinstance(g, dict) and "rules" in g for g in doc["groups"])


def check_promtool(body: str) -> str | None:
    if not shutil.which("promtool"):
        return None
    with tempfile.NamedTemporaryFile("w", suffix=".yml", delete=False) as fh:
        fh.write(body)
        path = fh.name
    try:
        proc = subprocess.run(
            ["promtool", "check", "rules", path],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            noise = ("level=", "Checking", "FAILED", "SUCCESS")
            lines = [
                ln.strip().replace(f"{path}: ", "")
                for ln in (proc.stdout + proc.stderr).splitlines()
                if ln.strip() and not ln.lstrip().startswith(noise)
            ]
            return "promtool: " + (lines[0] if lines else "rule file rejected")
    finally:
        Path(path).unlink(missing_ok=True)
    return None


def check_block(lang: str, body: str) -> str | None:
    if lang in {"yaml", "yml"}:
        try:
            docs = list(yaml.safe_load_all(body))
        except yaml.YAMLError as exc:
            return f"YAML invalide: {first_line(exc)}"
        for doc in docs:
            if is_prometheus_rules(doc):
                return check_promtool(body)
        return None
    if lang == "json":
        try:
            json.loads(body)
        except json.JSONDecodeError as exc:
            return f"JSON invalide: {exc.msg} (ligne {exc.lineno}, colonne {exc.colno})"
    return None


def first_line(exc: Exception) -> str:
    return str(exc).split("\n")[0].strip()


def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8", errors="replace")
    problems: list[str] = []
    for match in FENCE.finditer(text):
        info = match.group("info").strip()
        lang = info.split()[0].lower() if info else ""
        if lang not in {"yaml", "yml", "json"}:
            continue
        line = text[: match.start()].count("\n") + 1
        before = text[: match.start()].rstrip().rsplit("\n", 1)[-1]
        if SKIP_MARKER in before:
            continue
        body = textwrap.dedent(match.group("body"))
        problem = check_block(lang, body)
        if problem:
            problems.append(f"{path}:{line} ({lang}) {problem}")
    return problems


def main(argv: list[str]) -> int:
    problems: list[str] = []
    for name in argv:
        path = Path(name)
        if path.suffix == ".md" and path.is_file():
            problems.extend(check_file(path))

    if not problems:
        return 0

    print("Blocs de code invalides, un lecteur qui les copie se casse dessus:\n")
    for problem in problems:
        print(f"  {problem}")
    print(
        "\nCorriger le bloc, ou si l'exemple est cassé volontairement, ajouter"
        f"\n<!-- {SKIP_MARKER} --> sur la ligne juste avant la fence."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
