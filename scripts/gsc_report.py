#!/usr/bin/env python3
"""Report what a Search Console performance export says about the wiki.

usage: uv run scripts/gsc_report.py <export.zip> [--baseline <older.zip>] [--keep]
           [--min-impressions 300] [--page /linux/cli/ss/ ...] [--force]

Reads the zip Search Console exports from Performance (web search), without extracting it.
Prints the site totals, the pages sitting on page 1 that nobody clicks (with their current
H1 and description), the page 1 queries without a click, pages sharing a slug, and, against
a baseline export, what moved.
--keep copies the export to ~/.local/share/wiki-seo/. Without --baseline, the most recent
kept export that ends before this one starts is used.
An export that is hourly or shorter than 28 days is refused unless --force: a CTR per page
means nothing on a few clicks.
Exit code: 0 report printed, 2 export unusable. Tested on the French export only.
"""
import argparse
import csv
import io
import re
import shutil
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'
ARCHIVE = Path.home() / '.local' / 'share' / 'wiki-seo'
ARCHIVED = re.compile(r'gsc-(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.zip')
DAY = re.compile(r'\d{4}-\d{2}-\d{2}')
# The French export names its files with accents that zip tools mangle: match on a prefix.
MEMBERS = {'chart': ('Graphique', 'Chart'), 'pages': ('Pages',), 'queries': ('Requ', 'Queries')}
MAX_MEMBER = 5 * 1024 * 1024
MIN_DAYS = 28
PAGE_ONE = (3.5, 10.5)


class ExportError(Exception):
    """The export cannot support a report."""


@dataclass
class Row:
    key: str
    clicks: int
    impressions: int
    position: float

    @property
    def ctr(self):
        return 100 * self.clicks / self.impressions if self.impressions else 0.0


@dataclass
class Export:
    path: Path
    days: list
    pages: dict
    queries: list

    @property
    def first(self):
        return self.days[0].key

    @property
    def last(self):
        return self.days[-1].key

    @property
    def total(self):
        clicks = sum(d.clicks for d in self.days)
        impressions = sum(d.impressions for d in self.days)
        weighted = sum(d.position * d.impressions for d in self.days)
        return Row('site', clicks, impressions, weighted / impressions if impressions else 0.0)


def read_member(archive, kind):
    for info in archive.infolist():
        if Path(info.filename).name.startswith(MEMBERS[kind]):
            if info.file_size > MAX_MEMBER:
                raise ExportError(f'{info.filename}: larger than {MAX_MEMBER} bytes')
            text = archive.read(info).decode('utf-8-sig')
            rows = list(csv.reader(io.StringIO(text)))[1:]
            try:
                return [Row(r[0], int(r[1]), int(r[2]), float(r[4])) for r in rows if r]
            except (IndexError, ValueError) as exc:
                raise ExportError(f'{info.filename}: unexpected row ({exc})') from exc
    raise ExportError(f'no {kind} CSV in the export')


def load(path, force=False):
    try:
        with zipfile.ZipFile(path) as archive:
            days = read_member(archive, 'chart')
            pages = read_member(archive, 'pages')
            queries = read_member(archive, 'queries')
    except (OSError, zipfile.BadZipFile) as exc:
        raise ExportError(f'{path}: {exc}') from exc
    if not days:
        raise ExportError(f'{path}: empty chart')
    if not all(DAY.fullmatch(d.key) for d in days):
        raise ExportError(f'{path}: hourly export ({days[0].key}), export a date range in days')
    if len(days) < MIN_DAYS and not force:
        raise ExportError(f'{path}: {len(days)} days, {MIN_DAYS} needed (--force to read it anyway)')
    days.sort(key=lambda d: d.key)
    for page in pages:
        page.key = re.sub(r'^https?://[^/]+', '', page.key)
    return Export(Path(path), days, {p.key: p for p in pages}, queries)


def source_of(url):
    """H1 and description length of the article behind a URL, or None."""
    rel = url.split('#')[0].strip('/')
    for candidate in (DOCS / f'{rel}.md', DOCS / rel / 'index.md'):
        if rel and candidate.is_file():
            text = candidate.read_text(encoding='utf-8')
            h1 = re.search(r'^# (.+)$', text, re.M)
            desc = re.search(r'^description:\s*(.+)$', text, re.M)
            length = len(desc.group(1).strip('"\'')) if desc else 0
            return (h1.group(1) if h1 else '?', length)
    return None


def line(row, extra=''):
    return f'{row.impressions:7d} {row.clicks:6d} {row.ctr:5.1f}% {row.position:5.1f}  {row.key}{extra}'


HEADER = '    imp. clicks    CTR  pos.'


def report(export, min_impressions):
    total = export.total
    print(f'# Search Console, {export.first} to {export.last} ({len(export.days)} days)')
    print(f'\n{total.clicks} clicks, {total.impressions} impressions, CTR {total.ctr:.2f} %, '
          f'position {total.position:.1f}')

    pages = list(export.pages.values())
    print('\n## Pages by position\n')
    for low, high, label in ((0, 3.5, '1-3'), (3.5, 10.5, '4-10'), (10.5, 20.5, '11-20'), (20.5, 1e9, '21+')):
        bucket = [p for p in pages if low <= p.position < high]
        clicks, impressions = sum(p.clicks for p in bucket), sum(p.impressions for p in bucket)
        ctr = 100 * clicks / impressions if impressions else 0.0
        print(f'{label:>6}: {len(bucket):4d} pages {impressions:7d} imp. {clicks:5d} clicks, CTR {ctr:.2f} %')

    page_one = [p for p in pages if PAGE_ONE[0] <= p.position < PAGE_ONE[1]]
    impressions = sum(p.impressions for p in page_one)
    floor = 50 * sum(p.clicks for p in page_one) / impressions if impressions else 0.0
    weak = sorted((p for p in page_one if p.impressions >= min_impressions and p.ctr < floor),
                  key=lambda p: -p.impressions)
    print(f'\n## Page 1 pages nobody clicks (position 4-10, {min_impressions}+ impressions, '
          f'CTR under {floor:.2f} %)\n')
    print(HEADER)
    for page in weak:
        print(line(page))
        source = source_of(page.key)
        if source:
            print(f'{"":28}H1: {source[0]} (description: {source[1]} chars)')
    if not weak:
        print('(none)')

    print('\n## Page 1 queries without a click\n')
    print(HEADER)
    silent = sorted((q for q in export.queries if q.position < PAGE_ONE[1] and not q.clicks),
                    key=lambda q: -q.impressions)
    for query in silent[:20]:
        print(line(query))

    print('\n## Pages sharing a slug (candidates for a merge)\n')
    slugs = {}
    for page in pages:
        slug = page.key.split('#')[0].strip('/').rsplit('/', 1)[-1]
        if slug and page.impressions >= 50:
            slugs.setdefault(slug, []).append(page)
    shared = [group for group in slugs.values() if len({p.key.split('#')[0] for p in group}) > 1]
    for group in shared:
        for page in sorted(group, key=lambda p: -p.impressions):
            print(line(page))
    if not shared:
        print('(none)')

    print('\n## Pages bringing the clicks\n')
    print(HEADER)
    for page in sorted(pages, key=lambda p: -p.clicks)[:10]:
        print(line(page))

    seen = sum(q.impressions for q in export.queries)
    print(f'\nQueries CSV: {len(export.queries)} queries, {seen} of {total.impressions} impressions '
          '(Search Console hides the rest).')


def delta(new, old, digits=0):
    value = new - old
    return f'{value:+.{digits}f}'


def compare(export, baseline, min_impressions, forced):
    print(f'\n## Against {baseline.first} to {baseline.last} ({baseline.path.name})\n')
    if baseline.last >= export.first:
        print('WARNING: the two periods overlap, the deltas are understated.\n')
    new, old = export.total, baseline.total
    print(f'clicks {old.clicks} -> {new.clicks} ({delta(new.clicks, old.clicks)}), '
          f'impressions {old.impressions} -> {new.impressions} ({delta(new.impressions, old.impressions)}), '
          f'CTR {old.ctr:.2f} -> {new.ctr:.2f} %, position {old.position:.1f} -> {new.position:.1f}\n')

    def pair(url):
        empty = Row(url, 0, 0, 0.0)
        return export.pages.get(url, empty), baseline.pages.get(url, empty)

    urls = {u for u in set(export.pages) | set(baseline.pages)
            if max(p.impressions for p in pair(u)) >= min_impressions}
    movers = sorted(urls - set(forced), key=lambda u: -abs(pair(u)[0].clicks - pair(u)[1].clicks))[:12]
    print('  clicks (was)     imp. (was)   CTR (was)    pos. (was)')
    for url in [*forced, *movers]:
        now, was = pair(url)
        mark = '*' if url in forced else ' '
        print(f'{mark}{now.clicks:6d} ({was.clicks:4d}) {now.impressions:7d} ({was.impressions:5d}) '
              f'{now.ctr:5.1f}% ({was.ctr:4.1f}) {now.position:5.1f} ({was.position:4.1f})  {url}')
    if forced:
        print('\n* asked with --page. A page absent from an export shows 0.')


def kept_baseline(export):
    best = None
    for path in ARCHIVE.glob('gsc-*.zip'):
        match = ARCHIVED.fullmatch(path.name)
        if match and match.group(2) < export.first and (best is None or match.group(2) > best[0]):
            best = (match.group(2), path)
    return best[1] if best else None


def main():
    parser = argparse.ArgumentParser(description=(__doc__ or '').split('\n')[0])
    parser.add_argument('export', type=Path)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--keep', action='store_true', help=f'copy the export to {ARCHIVE}')
    parser.add_argument('--min-impressions', type=int, default=300)
    parser.add_argument('--page', action='append', default=[], help='page to show in the comparison')
    parser.add_argument('--force', action='store_true', help='read an export shorter than 28 days')
    args = parser.parse_args()

    try:
        export = load(args.export, args.force)
        baseline_path = args.baseline or kept_baseline(export)
        baseline = load(baseline_path, args.force) if baseline_path else None
    except ExportError as exc:
        print(f'UNUSABLE: {exc}', file=sys.stderr)
        return 2

    report(export, args.min_impressions)
    if baseline:
        compare(export, baseline, args.min_impressions, args.page)
    else:
        print(f'\nNo baseline: pass --baseline <older.zip>, or --keep exports in {ARCHIVE}.')

    if args.keep:
        ARCHIVE.mkdir(parents=True, exist_ok=True)
        target = ARCHIVE / f'gsc-{export.first}_{export.last}.zip'
        if not target.exists():
            shutil.copyfile(args.export, target)
        print(f'\nKept as {target}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
