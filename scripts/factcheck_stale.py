#!/usr/bin/env python3
"""List what a re-check of fact-checked articles has to look at.

usage: uv run scripts/factcheck_stale.py [docs/path.md ...] [--rev origin/master] [--fetch] [--all]

Reads factcheck/<path>.md (front matter: commit, sources, unpinned). For each article it
reports the lines changed since the checked commit (working tree by default) and the pinned
sources that moved upstream (commits touching the file in ~/Documents/work/src/<repo> since
the pinned one, after the check date).
Without paths, every article in factcheck/. Only stale articles are printed unless --all.
An article that could not be checked (missing clone, unreadable pin, bad entry) is UNKNOWN.
Exit code: 0 all up to date, 1 some articles stale, 2 some could not be checked.
"""
import argparse
import functools
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = Path.home() / 'Documents' / 'work' / 'src'
# Ledger values reach git as arguments: anything that is not a plain SHA, clone name or
# remote branch is refused, so a value like `--output=<file>` is never parsed as an option.
SHA = re.compile(r'[0-9a-f]{7,40}')
CLONE = re.compile(r'[A-Za-z0-9][\w.-]*')
BRANCH = re.compile(r'origin/[\w.][\w./-]*')
DATE = re.compile(r'\d{4}-\d{2}-\d{2}')


class CheckError(Exception):
    """Something the check depends on could not be read."""


def run_git(*args, cwd=ROOT):
    # GIT_NO_LAZY_FETCH: a pin missing from a partial clone must fail, not hit the network.
    return subprocess.run(['git', '-C', str(cwd), *args], capture_output=True, text=True, check=False,
                          env={**os.environ, 'GIT_NO_LAZY_FETCH': '1'})


def git_ok(*args, cwd=ROOT):
    return run_git(*args, cwd=cwd).returncode == 0


def git(*args, cwd=ROOT):
    r = run_git(*args, cwd=cwd)
    if r.returncode == 0:
        return r.stdout.strip()
    err = r.stderr.strip().splitlines()
    raise CheckError(f"git {args[0]} in {cwd.name}: {err[0] if err else f'exit {r.returncode}'}")


def read_entry(entry):
    parts = entry.read_text().split('---\n', 2)
    if len(parts) != 3 or parts[0]:
        raise CheckError('no front matter')
    try:
        meta = yaml.safe_load(parts[1])
    except yaml.YAMLError as e:
        raise CheckError(f'invalid front matter: {e}') from e
    if not isinstance(meta, dict):
        raise CheckError('front matter is not a mapping')
    expected = 'docs/' + entry.relative_to(ROOT / 'factcheck').as_posix()
    if meta.get('article') != expected:
        raise CheckError(f"article is {meta.get('article')!r}, expected {expected!r}")
    if not SHA.fullmatch(str(meta.get('commit'))):
        raise CheckError(f"commit {meta.get('commit')!r} is not a SHA")
    if not DATE.fullmatch(str(meta.get('checked'))):
        raise CheckError(f"checked {meta.get('checked')!r} is not a YYYY-MM-DD date")
    return meta


def clone_dir(repo):
    if not isinstance(repo, str) or not CLONE.fullmatch(repo):
        raise CheckError(f'repo {repo!r} is not a clone name')
    clone = SRC / repo
    if not (clone / '.git').exists():
        raise CheckError(f'clone {repo} missing under {SRC}')
    return clone


@functools.cache
def commit_time(clone, commit):
    return int(git('show', '-s', '--format=%ct', '--end-of-options', commit, cwd=clone))


@functools.cache
def fetch(clone):
    """None once fetched, else the error: a failed fetch is reported, never retried per entry."""
    try:
        git('fetch', '-q', cwd=clone)
    except CheckError as e:
        return str(e)
    return None


@functools.cache
def upstream(clone, ref):
    # The branch the source was read from (origin/devel for ansible), else the default one.
    pinned = [ref] if isinstance(ref, str) and BRANCH.fullmatch(ref) else []
    for cand in (*pinned, 'origin/HEAD', 'origin/main', 'origin/master'):
        if git_ok('rev-parse', '--verify', '-q', '--end-of-options', cand, cwd=clone):
            return cand
    raise CheckError(f'no upstream branch in {clone.name}')


def check(entry, rev, do_fetch):
    """(meta, lines changed, moved sources, unpinned claims) of one ledger entry."""
    meta = read_entry(entry)
    target = [f"{meta['commit']}..{rev}"] if rev else [meta['commit']]
    numstat = git('diff', '--numstat', '--end-of-options', *target, '--', meta['article'])
    changed = sum(int(n) for line in numstat.splitlines() for n in line.split()[:2] if n.isdigit())

    # A file cited at an old tag and at HEAD is judged from its newest pin only.
    newest, unresolved = {}, 0
    for src in meta.get('sources') or []:
        if not src.get('repo') or not src.get('commit'):
            unresolved += 1
            continue
        if not SHA.fullmatch(str(src['commit'])):
            raise CheckError(f"source commit {src['commit']!r} is not a SHA")
        clone = clone_dir(src['repo'])
        when = commit_time(clone, src['commit'])
        key = (src['repo'], src['path'])
        if when >= newest.get(key, (-1,))[0]:
            newest[key] = (when, src['commit'], src.get('ref'))

    moved = []
    for (repo, path), (_, commit, ref) in sorted(newest.items()):
        clone = clone_dir(repo)
        if do_fetch and (err := fetch(clone)):
            raise CheckError(err)
        head = upstream(clone, ref)
        # Only upstream changes after the check: older ones were seen, or a tag was pinned on purpose.
        log = git('log', '--oneline', f"--since={meta['checked']}", '--end-of-options',
                  f'{commit}..{head}', '--', path, cwd=clone)
        if log:
            moved.append(f'{repo}:{path} (+{len(log.splitlines())} commits)')
    return meta, changed, moved, (meta.get('unpinned') or 0) + unresolved


def entry_path(arg, ap):
    path = Path(arg)
    if not path.is_absolute() and not path.exists():
        path = ROOT / path
    try:
        return ROOT / 'factcheck' / path.resolve().relative_to(ROOT / 'docs')
    except ValueError:
        ap.error(f'{arg}: not under {ROOT / "docs"}')


def main():
    ap = argparse.ArgumentParser(description=(__doc__ or '').split('\n')[0])
    ap.add_argument('articles', nargs='*', help='docs/... paths (default: every factcheck entry)')
    ap.add_argument('--rev', help='wiki revision to compare the article against (default: working tree)')
    ap.add_argument('--fetch', action='store_true', help='git fetch each source clone first')
    ap.add_argument('--all', action='store_true', help='also print up-to-date articles')
    args = ap.parse_args()
    if args.rev and not git_ok('rev-parse', '--verify', '-q', '--end-of-options', args.rev):
        ap.error(f'--rev {args.rev}: unknown revision')

    if args.articles:
        entries = [entry_path(a, ap) for a in args.articles]
    else:
        entries = sorted((ROOT / 'factcheck').rglob('*.md'))

    stale = unknown = 0
    for entry in entries:
        name = entry.relative_to(ROOT)
        if not entry.exists():
            print(f'STALE   {name}: no fact-check entry, full check needed')
            stale += 1
            continue
        try:
            meta, changed, moved, unpinned = check(entry, args.rev, args.fetch)
        except CheckError as e:
            print(f'UNKNOWN {name}: {e}')
            unknown += 1
            continue
        is_stale = changed or moved
        stale += bool(is_stale)
        if is_stale or args.all:
            state = 'STALE' if is_stale else 'ok'
            print(f"{state:7} {meta['article']} checked {meta['checked']}: {changed} lines changed, "
                  f'{len(moved)} sources moved, {unpinned} unpinned')
            for m in moved:
                print(f'        moved {m}')
    print(f'{stale + unknown}/{len(entries)} articles to re-check ({stale} stale, {unknown} unknown)',
          file=sys.stderr)
    return 2 if unknown else 1 if stale else 0


if __name__ == '__main__':
    sys.exit(main())
