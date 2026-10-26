#!/usr/bin/env python3
"""Compare wiki articles side by side: the live site next to the local dev server.

usage: scripts/wiki_compare.py [docs/path.md ...] [--base origin/master] [--port 8001] [--no-open]

Needs `properdocs serve -f properdocs.dev.yml` on 127.0.0.1:8000. Without paths, lists
every docs/**/*.md that differs from the base (committed or not). Both sites are
proxied on one local port so the page can sync their scroll and outline the
blocks that changed. Ctrl-C to stop.
"""
import argparse
import json
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = 'https://wiki.jdelgado.fr/'
LOCAL = 'http://127.0.0.1:8000/'


def git(*args):
    return subprocess.run(['git', '-C', str(ROOT), *args], capture_output=True, text=True, check=False)


def url_path(rel):
    """docs/ci-cd/github/go-ci.md -> ci-cd/github/go-ci/ (directory URLs)."""
    p = Path(rel).relative_to('docs').with_suffix('')
    return '' if str(p) == 'index' else (str(p.parent) + '/' if p.name == 'index' else str(p) + '/')


def port_busy(port):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', port)) == 0


PAGE = r"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Wiki compare</title>
<style>
:root { --bg:#f6f5f2; --ink:#1f2328; --soft:#57606a; --bd:#dcdad4; --del:#e5534b; --ins:#2da44e; }
@media (prefers-color-scheme: dark) { :root { --bg:#161b22; --ink:#e6edf3; --soft:#9da7b3; --bd:#30363d; } }
* { box-sizing:border-box; }
html, body { height:100%; margin:0; }
body { background:var(--bg); color:var(--ink); font:14px/1.4 system-ui,sans-serif; display:flex; flex-direction:column; }
header { display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:8px 16px; border-bottom:1px solid var(--bd); }
select, button, label { font:inherit; color:var(--ink); background:transparent; border:1px solid var(--bd); border-radius:6px; padding:3px 10px; cursor:pointer; }
#stat { color:var(--soft); }
.k { display:inline-block; width:10px; height:10px; border-radius:2px; margin:0 4px 0 10px; vertical-align:-1px; }
main { flex:1; display:grid; grid-template-columns:1fr 1fr; min-height:0; }
.col { display:flex; flex-direction:column; min-height:0; border-right:1px solid var(--bd); }
.col h2 { margin:0; padding:4px 12px; font-size:12px; font-weight:600; color:var(--soft); text-transform:uppercase; letter-spacing:.05em; }
iframe { flex:1; width:100%; border:0; background:#fff; }
@media (max-width:900px) { main { grid-template-columns:1fr; grid-template-rows:1fr 1fr; } }
</style></head><body>
<header>
  <select id="art"></select>
  <span id="stat">chargement...</span>
  <span><span class="k" style="background:var(--del)"></span>live seulement<span class="k" style="background:var(--ins)"></span>local seulement</span>
  <span style="margin-left:auto"></span>
  <label><input type="checkbox" id="sync" checked> scroll lié</label>
  <button id="prev" title="k">&uarr;</button><button id="next" title="j">&darr;</button>
  <button id="reload" title="r">&#8635;</button>
</header>
<main>
  <div class="col"><h2>Live (wiki.jdelgado.fr)</h2><iframe id="L"></iframe></div>
  <div class="col"><h2>Local (properdocs serve)</h2><iframe id="R"></iframe></div>
</main>
<script>
const ARTICLES = __ARTICLES__;
const SEL = 'h1,h2,h3,h4,h5,p,pre,li,tr,figcaption,img,.admonition-title';
const L = document.getElementById('L'), R = document.getElementById('R');
const art = document.getElementById('art'), stat = document.getElementById('stat');
let zones = [], cur = -1, pairL = [], pairR = [], bl = [], br = [];

for (const a of ARTICLES) art.add(new Option(a.rel, a.path));
art.onchange = load;
document.getElementById('reload').onclick = load;

function load() {
  stat.textContent = 'chargement...';
  // after the first pair, a load of the local frame is mkdocs' live reload: diff again in place
  let n = 0; const done = () => { if (++n === 2) { analyse(); R.onload = reloaded; } };
  L.onload = R.onload = done;
  L.src = '/live/' + art.value + '?t=' + Date.now();
  R.src = '/local/' + art.value;
}

let lastY = 0;
function reloaded() {
  R.contentWindow.scrollTo({top: lastY, behavior: 'instant'});
  analyse();
  stat.textContent += ', local rechargé à ' + new Date().toLocaleTimeString();
}

function blocks(doc) {
  const root = doc.querySelector('article') || doc.body;
  return [...root.querySelectorAll(SEL)].filter(e => !e.querySelector(SEL) && !e.closest('.md-source-file, .jd-meta, nav, header, .md-sidebar'));
}
const key = e => e.tagName + ':' + (e.tagName === 'IMG' ? (e.getAttribute('src') || '').split('/').pop()
  : e.textContent.replace(/\s+/g, ' ').trim());

function analyse() {
  const dl = L.contentDocument, dr = R.contentDocument;
  if (!dl || !dr) { stat.textContent = 'frame inaccessible'; return; }
  zones = []; cur = -1;
  bl = blocks(dl); br = blocks(dr);
  const a = bl.map(key), b = br.map(key), n = a.length, m = b.length;
  // LCS on block keys: what stays matched is unchanged, the rest is a change.
  const t = Array.from({length: n + 1}, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  pairL = new Array(n).fill(-1); pairR = new Array(m).fill(-1);
  let i = 0, j = 0, z = null;
  const flush = () => { if (z) { zones.push(z); z = null; } };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { pairL[i] = j; pairR[j] = i; i++; j++; flush(); }
    else if (j < m && (i === n || t[i][j + 1] >= t[i + 1][j])) { (z ||= {l: [], r: []}).r.push(j); j++; }
    else { (z ||= {l: [], r: []}).l.push(i); i++; }
  }
  flush();
  for (const [doc, cls, col] of [[dl, 'jdc-del', '229,83,75'], [dr, 'jdc-ins', '45,164,78']]) {
    if (doc.getElementById('jdc-style')) continue;
    const s = doc.createElement('style');
    s.id = 'jdc-style';
    s.textContent = `.${cls}{background:rgba(${col},.16)!important;box-shadow:-6px 0 0 rgb(${col});border-radius:2px}
      .jdc-cur{outline:2px dashed rgb(${col});outline-offset:3px}
      html{scroll-behavior:auto!important}`;
    doc.head.appendChild(s);
  }
  zones.forEach(z => { z.l.forEach(k => bl[k].classList.add('jdc-del')); z.r.forEach(k => br[k].classList.add('jdc-ins')); });
  stat.textContent = `${zones.length} zones modifiées`;
  for (const [f, other] of [[L, R], [R, L]]) {
    const w = f.contentWindow, d = f.contentDocument;
    if (w.__jdc) continue;
    w.__jdc = true;
    // Material's instant navigation (an anchor click included) swaps the page content
    // without a load event: re-run the diff once the blocks we marked are gone.
    let pending = 0;
    new w.MutationObserver(() => {
      clearTimeout(pending);
      pending = setTimeout(() => { if (bl.some(e => !e.isConnected) || br.some(e => !e.isConnected)) analyse(); }, 150);
    }).observe(d.documentElement, {childList: true, subtree: true});
    // only the frame under the user's hand drives the other, so the 2 never chase each other
    for (const ev of ['wheel', 'pointerdown', 'touchstart', 'keydown', 'mouseenter'])
      d.addEventListener(ev, () => { active = f; }, {passive: true, capture: true});
    w.addEventListener('scroll', () => {
      if (f === R) lastY = w.scrollY;
      if (active === f) requestAnimationFrame(() => sync(f, other));
    }, {passive: true});
    d.addEventListener('keydown', keys);
  }
}

// Map the scroll position through the matched blocks: between 2 unchanged blocks the
// other frame moves proportionally, so changed stretches of different length stay aligned.
let active = null;
function sync(src, dst) {
  if (!document.getElementById('sync').checked) return;
  const sw = src.contentWindow, dw = dst.contentWindow;
  const [mine, theirs, pair] = src === L ? [bl, br, pairL] : [br, bl, pairR];
  const pts = [[0, 0]];
  for (let k = 0; k < mine.length; k++) if (pair[k] >= 0)
  {
    const q = [mine[k].getBoundingClientRect().top + sw.scrollY, theirs[pair[k]].getBoundingClientRect().top + dw.scrollY];
    // keep the points increasing on both sides: a sticky or hidden block would fold the mapping
    if (q[0] > pts.at(-1)[0] && q[1] > pts.at(-1)[1]) pts.push(q);
  }
  pts.push([sw.document.documentElement.scrollHeight, dw.document.documentElement.scrollHeight]);
  const y = sw.scrollY + sw.innerHeight / 3;
  let s = 1; while (s < pts.length - 1 && pts[s][0] < y) s++;
  const [a, b] = [pts[s - 1], pts[s]];
  const r = b[0] > a[0] ? (y - a[0]) / (b[0] - a[0]) : 0;
  dw.scrollTo({top: a[1] + r * (b[1] - a[1]) - dw.innerHeight / 3, behavior: 'instant'});
}

function go(d) {
  if (!zones.length) return;
  document.querySelectorAll('iframe').forEach(f => f.contentDocument.querySelectorAll('.jdc-cur').forEach(e => e.classList.remove('jdc-cur')));
  cur = (cur + d + zones.length) % zones.length;
  const z = zones[cur];
  const el = z.l.length ? bl[z.l[0]] : null, er = z.r.length ? br[z.r[0]] : null;
  active = null;
  for (const [e, f] of [[el, L], [er, R]]) if (e) { e.classList.add('jdc-cur'); e.scrollIntoView({block: 'center'}); }
  // a zone missing on one side scrolls that side to the block just before it
  if (!el && er) anchor(L, z.r[0], pairR, bl);
  if (!er && el) anchor(R, z.l[0], pairL, br);
  stat.textContent = `zone ${cur + 1}/${zones.length}`;
}
function anchor(f, k, pair, list) {
  let p = k; while (p >= 0 && pair[p] < 0) p--;
  if (p >= 0) list[pair[p]].scrollIntoView({block: 'center'});
}

function keys(e) {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  if (e.key === 'j') go(1); else if (e.key === 'k') go(-1); else if (e.key === 'r') load();
}
document.addEventListener('keydown', keys);
document.getElementById('next').onclick = () => go(1);
document.getElementById('prev').onclick = () => go(-1);
if (ARTICLES.length) load(); else stat.textContent = 'aucun article modifié';
</script></body></html>"""


def make_handler(page):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path in ('/', '/index.html'):
                return self.reply(200, 'text/html; charset=utf-8', page.encode())
            # mkdocs' live reload script long-polls /livereload/ from the local frame
            if self.path.startswith('/livereload/'):
                return self.proxy(LOCAL + self.path.lstrip('/'), timeout=90)
            for prefix, upstream in (('/live/', LIVE), ('/local/', LOCAL)):
                if self.path.startswith(prefix):
                    return self.proxy(upstream + self.path[len(prefix):])
            self.reply(404, 'text/plain', b'not found')

        def proxy(self, url, timeout=15):
            req = urllib.request.Request(url, headers={'Accept-Encoding': 'identity', 'User-Agent': 'wiki-compare'})
            try:
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    self.reply(r.status, r.headers.get('Content-Type', 'application/octet-stream'), r.read())
            except urllib.error.HTTPError as e:
                self.reply(e.code, e.headers.get('Content-Type', 'text/plain'), e.read())
            except (urllib.error.URLError, TimeoutError) as e:
                self.reply(502, 'text/plain', f'{url}: {e}'.encode())

        def reply(self, code, ctype, body):
            self.send_response(code)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):  # noqa: A002 (silence request logs)
            pass

    return Handler


def main():
    ap = argparse.ArgumentParser(description=(__doc__ or '').split('\n')[0])
    ap.add_argument('paths', nargs='*', help='articles under docs/, default: every changed one')
    ap.add_argument('--base', default='origin/master', help='what is live (default: origin/master)')
    ap.add_argument('--port', type=int, default=8001)
    ap.add_argument('--no-open', action='store_true', help='only print the URL')
    args = ap.parse_args()

    if not port_busy(8000):
        sys.exit('no dev server on 127.0.0.1:8000, start: properdocs serve -f properdocs.dev.yml')
    if port_busy(args.port):
        sys.exit(f'port {args.port} already taken, pass --port')
    git('fetch', '-q', 'origin')
    if git('rev-parse', '--verify', '-q', args.base).returncode:
        sys.exit(f'unknown base {args.base}')
    paths = args.paths or [p for p in git('diff', '--name-only', args.base, '--', 'docs').stdout.split()
                           if p.endswith('.md')]
    articles = []
    for rel in paths:
        rel = str(Path(rel).resolve().relative_to(ROOT)) if Path(rel).is_absolute() else rel
        if not rel.startswith('docs/') or not rel.endswith('.md'):
            print(f'skipped {rel}: not an article under docs/')
            continue
        articles.append({'rel': rel.removeprefix('docs/'), 'path': url_path(rel)})
    page = PAGE.replace('__ARTICLES__', json.dumps(articles))

    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler(page))
    url = f'http://127.0.0.1:{args.port}/'
    print(f'{url}  ({len(articles)} article(s), Ctrl-C to stop)', flush=True)
    if not args.no_open and sys.platform == 'darwin':
        subprocess.run(['open', url], check=False)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
