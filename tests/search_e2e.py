#!/usr/bin/env python3
"""End-to-end checks of the search UI (Cmd+K palette, header search, home hero, 404) on a built site.

usage: uv run -q --no-project --with playwright python -I tests/search_e2e.py [--url URL] [--compare URL]

Serve a full build first: python3 -m http.server 8020 --bind 127.0.0.1 -d <site_dir>.
--compare runs the ranking queries against a second build (e.g. the Lunr palette of
origin/master) and prints both top results side by side. Uses the installed Chrome.
"""
import argparse
import sys
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

QUERIES = [
    "sed", "haproxy", "hapr", "réplication postgres", "memoire", "kubectl",
    "argocd sync", "terraform", "certificat ssl", "systemd timer", "tcpdump", "sauvegardes",
]
MOD = "Meta" if sys.platform == "darwin" else "Control"
TITLES = ".jd-pal__list a .jd-pal__title"

failures = []
# The full build loads gtag.js on the first key press: keep test runs out of the real analytics.
ANALYTICS = "**/{www.googletagmanager.com,www.google-analytics.com,*.google-analytics.com}/**"


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  ' + detail if detail else ''}")
    if not ok:
        failures.append(name)


def open_palette(page):
    page.keyboard.press(f"{MOD}+k")
    page.wait_for_selector("#jd-pal:not([hidden])", timeout=3000)


def query(page, q, timeout=4000):
    """Types q in the open palette and returns (titles, hrefs) of the page rows once they settle."""
    inp = page.locator("#jd-pal input")
    inp.fill("")
    inp.fill(q)
    deadline = time.time() + timeout / 1000
    last, stable = None, 0
    while time.time() < deadline:
        rows = page.eval_on_selector_all(TITLES, "els => els.map(e => [e.textContent, e.closest('a').href])")
        loading = page.evaluate("""() => { const e = document.querySelector('#jd-pal .jd-pal__empty');
            return !!e && e.textContent === (window.jdI18n || {})['jd.pal.loading']; }""")
        if rows == last and not loading:
            stable += 1
            if stable >= 3:
                break
        else:
            stable = 0
        last = rows
        page.wait_for_timeout(100)
    rows = last or []
    return [r[0] for r in rows], [r[1] for r in rows]


def path(href):
    return urlparse(href).path


def run_checks(browser, base):
    for scheme in ("light", "dark"):
        ctx = browser.new_context(color_scheme=scheme, viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(base + "linux/cli/sed/")
        page.wait_for_load_state("networkidle")

        open_palette(page)
        check(f"[{scheme}] palette opens with {MOD}+K", page.locator("#jd-pal input").evaluate("e => e === document.activeElement"))
        bg = page.locator(".jd-pal__dlg").evaluate("e => getComputedStyle(e).backgroundColor")
        body_scheme = page.evaluate("document.body.getAttribute('data-md-color-scheme')")
        check(f"[{scheme}] palette themed", bg not in ("rgba(0, 0, 0, 0)", "transparent"), f"bg={bg} scheme={body_scheme}")
        page.screenshot(path=f"{OUT}/palette-{scheme}.png")

        titles, hrefs = query(page, "sed")
        check(f"[{scheme}] 'sed' ranks the sed article first", bool(hrefs) and path(hrefs[0]).endswith("/linux/cli/sed/"), str(titles[:3]))
        groups = page.eval_on_selector_all("#jd-pal .jd-pal__group", "els => els.map(e => e.textContent)")
        check(f"[{scheme}] group labels (pages, sections/tags, actions)", len(groups) >= 3, str(groups))
        tags = page.eval_on_selector_all("#jd-pal .jd-pal__line", "els => els.map(e => e.textContent)")
        check(f"[{scheme}] tag row with its count", any("sed" in t and "article" in t for t in tags), str(tags[:4]))
        count = page.locator("#jd-pal .jd-pal__count").text_content()
        check(f"[{scheme}] indexed article count in footer", any(c.isdigit() for c in count), count)
        ex = page.locator("#jd-pal .jd-pal__ex mark").count()
        check(f"[{scheme}] excerpt marks the hit", ex > 0)
        page.screenshot(path=f"{OUT}/palette-sed-{scheme}.png")

        if scheme == "dark":
            ctx.close()
            check(f"[{scheme}] no JS errors", not errors, str(errors[:2]))
            continue

        titles, hrefs = query(page, "réplication postgres")
        check("accented query 'réplication postgres'", bool(hrefs) and "postgresql_replication" in hrefs[0], str(titles[:2]))
        t2, h2 = query(page, "replication postgres")
        check("accent-insensitive: same top without accents", bool(h2) and bool(hrefs) and path(h2[0]) == path(hrefs[0]), str(t2[:1]))
        titles, hrefs = query(page, "mémoire")
        check("accented single word 'mémoire'", bool(hrefs), str(titles[:2]))

        # Keyboard navigation: second row, Enter navigates with the ?h= handoff and the highlight bar.
        titles, hrefs = query(page, "haproxy")
        page.keyboard.press("ArrowDown")
        sel = page.locator('#jd-pal .jd-pal__row[aria-selected="true"]').get_attribute("href")
        check("ArrowDown selects the second row", len(hrefs) > 1 and sel == hrefs[1], f"{sel}")
        page.keyboard.press("Enter")
        page.wait_for_url(lambda u: path(u) == path(sel or ""), timeout=5000)
        check("Enter navigates to the selected row", path(page.url) == path(sel or ""), page.url)
        check("?h= handed to the target page", "h=haproxy" in page.url)
        try:
            page.wait_for_selector(".jd-hl", timeout=5000)
            hl = page.locator(".jd-hl").text_content()
        except Exception:
            hl = ""
        check("highlight bar counts the marked terms", "occurrence" in hl, hl.strip()[:60])
        check("palette closed after navigation", page.evaluate("() => { const e = document.getElementById('jd-pal'); return !e || e.hidden; }"))

        # Enter typed before the debounced results land opens the first page, not an action.
        open_palette(page)
        page.locator("#jd-pal input").fill("terraform")
        page.keyboard.press("Enter")
        page.wait_for_url(lambda u: "/automation/terraform/" in u, timeout=5000)
        check("fast Enter waits for the results", "/automation/terraform/" in page.url, page.url)

        # Escape closes, Ctrl+K works too.
        page.keyboard.press("Control+k")
        page.wait_for_selector("#jd-pal:not([hidden])", timeout=3000)
        page.keyboard.press("Escape")
        check("Ctrl+K opens, Escape closes", page.locator("#jd-pal").evaluate("e => e.hidden"))

        # Header search icon / field opens the palette.
        page.locator(".jd-search-toggle:visible, .md-search__form:visible, .md-search__input:visible").first.click()
        page.wait_for_selector("#jd-pal:not([hidden])", timeout=3000)
        check("header search opens the palette", True)
        page.keyboard.press("Escape")

        # MaterialX's own search (keyboard fallback 's') still answers on Pagefind.
        page.locator("body").click(position={"x": 5, "y": 300})
        page.keyboard.press("s")
        try:
            page.wait_for_selector(".md-search__input:focus", timeout=3000)
            page.keyboard.type("sed")
            page.wait_for_selector(".md-search-result__item", timeout=6000)
            n = page.locator(".md-search-result__item").count()
        except Exception:
            n = 0
        check("MaterialX search (key 's') returns results", n > 0, f"{n} items")
        page.keyboard.press("Escape")

        # Home hero search opens the palette.
        page.goto(base)
        page.wait_for_load_state("networkidle")
        page.locator("[data-jd-home-search]").click()
        page.wait_for_selector("#jd-pal:not([hidden])", timeout=3000)
        titles, hrefs = query(page, "kubectl")
        check("home hero search opens a working palette", bool(hrefs), str(titles[:1]))
        page.keyboard.press("Escape")

        # 404 suggestions: http.server has no custom 404, serve 404.html for the missing path.
        body = page.request.get(base + "404.html").text()
        page.route("**/linux/sed/", lambda r: r.fulfill(status=404, body=body, content_type="text/html"))
        page.goto(base + "linux/sed/")
        try:
            page.wait_for_selector("[data-jd-near]:not([hidden]) li a", timeout=8000)
            near = page.eval_on_selector_all("[data-jd-near-list] li a", "els => els.map(e => e.getAttribute('href'))")
        except Exception:
            near = []
        check("404 suggests the sed article for /linux/sed/", any(h.endswith("linux/cli/sed/") for h in near), str(near))
        page.screenshot(path=f"{OUT}/404-{scheme}.png")
        check(f"[{scheme}] no JS errors", not errors, str(errors[:2]))
        ctx.close()


def ranking(browser, base):
    page = browser.new_page()
    page.goto(base + "linux/cli/sed/")
    page.wait_for_load_state("networkidle")
    open_palette(page)
    out = {}
    for q in QUERIES:
        t0 = time.time()
        titles, hrefs = query(page, q)
        out[q] = ([path(h) for h in hrefs], time.time() - t0)
    page.close()
    return out


def _no_analytics(new_context):
    def wrapped(**kw):
        ctx = new_context(**kw)
        ctx.route(ANALYTICS, lambda r: r.abort())
        return ctx
    return wrapped


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8020/")
    ap.add_argument("--compare", help="second build to rank the same queries against")
    ap.add_argument("--out", default=".", help="directory for screenshots")
    args = ap.parse_args()
    OUT = args.out
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        browser.new_context = _no_analytics(browser.new_context)
        browser.new_page = lambda **kw: browser.new_context(**kw).new_page()
        run_checks(browser, args.url)
        if args.compare:
            a, b = ranking(browser, args.url), ranking(browser, args.compare)
            print("\n| Query | This build (top 3) | Compared build (top 3) |")
            print("| --- | --- | --- |")
            for q in QUERIES:
                fmt = lambda r: "<br>".join(r[0]) or "(none)"
                print(f"| `{q}` | {fmt(a[q])} | {fmt(b[q])} |")
        browser.close()
    print(f"\n{len(failures)} failure(s)" + (": " + ", ".join(failures) if failures else ""))
    sys.exit(1 if failures else 0)
