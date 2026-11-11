#!/usr/bin/env python3
"""List what a re-check of fact-checked articles has to look at.

usage: uv run scripts/factcheck_stale.py [docs/path.md ...] [--rev origin/master] [--fetch] [--all]

Reads factcheck/<path>.md (front matter: commit, sources, unpinned). For each article it
reports the lines changed since the checked commit (working tree by default) and the pinned
sources that moved upstream (commits touching the file in ~/Documents/work/src/<repo> since
the pinned one).
Without paths, every article in factcheck/. Only stale articles are printed unless --all.
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = Path.home() / 'Documents' / 'work' / 'src'


def git(*args, cwd=ROOT):
    # GIT_NO_LAZY_FETCH: a pin missing from a partial clone must fail, not hit the network.
    r = subprocess.run(['git', '-C', str(cwd), *args], capture_output=True, text=True, check=False,
                       env={**os.environ, 'GIT_NO_LAZY_FETCH': '1'})
    return r.stdout.strip() if r.returncode == 0 else None


def read_entry(path):
    text = path.read_text()
    _, meta, _ = text.split('---\n', 2)
    return yaml.safe_load(meta)


def upstream_head(clone):
    for ref in ('origin/HEAD', 'origin/main', 'origin/master'):
        if git('rev-parse', '--verify', '-q', ref, cwd=clone):
            return ref
    return None


def main():
    ap = argparse.ArgumentParser(description=(__doc__ or '').split('\n')[0])
    ap.add_argument('articles', nargs='*', help='docs/... paths (default: every factcheck entry)')
    ap.add_argument('--rev', help='wiki revision to compare the article against (default: working tree)')
    ap.add_argument('--fetch', action='store_true', help='git fetch each source clone first')
    ap.add_argument('--all', action='store_true', help='also print up-to-date articles')
    args = ap.parse_args()

    if args.articles:
        entries = [ROOT / 'factcheck' / Path(a).relative_to('docs') for a in args.articles]
    else:
        entries = sorted((ROOT / 'factcheck').rglob('*.md'))

    fetched, stale = set(), 0
    for entry in entries:
        if not entry.exists():
            print(f'{entry.relative_to(ROOT)}: no fact-check entry, full check needed')
            stale += 1
            continue
        meta = read_entry(entry)
        article = meta['article']
        target = [f"{meta['commit']}..{args.rev}"] if args.rev else [meta['commit']]
        numstat = git('diff', '--numstat', *target, '--', article) or ''
        changed = sum(int(n) for line in numstat.splitlines() for n in line.split()[:2] if n.isdigit())

        # A file cited at an old tag and at HEAD is judged from its newest pin only.
        newest, unresolved = {}, 0
        for src in meta.get('sources') or []:
            if not src.get('repo') or not src.get('commit'):
                unresolved += 1
                continue
            clone = SRC / src['repo']
            when = int(git('show', '-s', '--format=%ct', src['commit'], cwd=clone) or 0)
            key = (src['repo'], src['path'])
            if when >= newest.get(key, (-1, None))[0]:
                newest[key] = (when, src['commit'])

        moved = []
        for (repo, path), (_, commit) in sorted(newest.items()):
            clone = SRC / repo
            if args.fetch and clone not in fetched:
                git('fetch', '-q', cwd=clone)
                fetched.add(clone)
            head = upstream_head(clone)
            # Only upstream changes after the check: older ones were seen, or a tag was pinned on purpose.
            log = git('log', '--oneline', f"--since={meta['checked']}", f'{commit}..{head}', '--', path,
                      cwd=clone) if head else None
            if log:
                moved.append(f'{repo}:{path} (+{len(log.splitlines())} commits)')

        unpinned = (meta.get('unpinned') or 0) + unresolved
        is_stale = changed or moved
        stale += bool(is_stale)
        if is_stale or args.all:
            state = 'STALE' if is_stale else 'ok'
            print(f"{state:5} {article} checked {meta['checked']}: {changed} lines changed, "
                  f"{len(moved)} sources moved, {unpinned} unpinned")
            for m in moved:
                print(f'      moved {m}')
    print(f'{stale}/{len(entries)} articles to re-check', file=sys.stderr)


if __name__ == '__main__':
    main()
