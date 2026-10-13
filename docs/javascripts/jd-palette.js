/* Cmd+K command palette over Material's search index. Material search stays as keyboard fallback (s / f). */
(function () {
  "use strict";

  function tr(k) { return (window.jdI18n || {})[k] || k; }
  function tn(k, n) { return tr(k + (n === 1 ? "_one" : "_other")).replace("{n}", n); }

  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var MOD = IS_MAC ? "⌘" : "Ctrl+";
  var MAX_PAGES = 3;

  var state = { index: null, loading: null, open: false, rows: [], sel: 0, lastFocus: null };
  var ui = null;

  /* ---------- helpers ---------- */

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  // The index stores sections as HTML fragments: keep the text only.
  function plain(html) {
    return (html || "").replace(/<[^>]*>/g, " ").replace(/&(lt|gt|amp|quot|#39);/g, function (m, c) {
      return { lt: "<", gt: ">", amp: "&", quot: '"', "#39": "'" }[c];
    }).replace(/\s+/g, " ").trim();
  }
  function pretty(seg) {
    var s = decodeURIComponent(seg).replace(/[-_]+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function scope() {
    if (typeof __md_scope !== "undefined") return __md_scope;
    return new URL("/", location.href);
  }
  function url(path) { return new URL(path, scope()).href; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(path, extra) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", "18");
    s.setAttribute("height", "18");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("class", "jd-pal__ico");
    path.split("|").forEach(function (d) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      s.appendChild(p);
    });
    if (extra) {
      var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", "7.5"); c.setAttribute("cy", "8.5"); c.setAttribute("r", "1.2");
      s.appendChild(c);
    }
    return s;
  }
  var ICON_PAGE = "M6 3h9l4 4v14H6z|M14 3v5h5";
  var ICON_FOLDER = "M3 6h7l2 2h9v11H3z";
  var ICON_TAG = "M3 12V4h8l10 10-8 8z";

  /* ---------- index ---------- */

  function loadIndex() {
    if (state.index) return Promise.resolve(state.index);
    if (state.loading) return state.loading;
    // jd-pages.json (hooks/article_meta.py) lists the real articles; without it a prefix heuristic is used.
    var kinds = fetch(url("search/jd-pages.json")).then(function (r) { return r.json(); })
      .then(function (j) { return j.articles || null; }).catch(function () { return null; });
    state.loading = fetch(url("search/search_index.json"))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { return kinds.then(function (a) { state.index = build(data.docs || [], a); return state.index; }); })
      .catch(function () { state.loading = null; state.index = { pages: [], sections: [], tags: [], failed: true }; return state.index; });
    return state.loading;
  }

  function build(docs, articleLocs) {
    var pages = {}, order = [];
    function page(base) {
      if (!pages[base]) { pages[base] = { loc: base, title: "", text: "", heads: [], tags: [] }; order.push(base); }
      return pages[base];
    }
    docs.forEach(function (d) {
      var i = d.location.indexOf("#"), base = i < 0 ? d.location : d.location.slice(0, i);
      var p = page(base);
      if (i < 0) {
        p.title = plain(d.title); p.text = plain(d.text); p.tags = d.tags || [];
      } else {
        p.heads.push({ anchor: d.location.slice(i), title: plain(d.title), text: plain(d.text) });
      }
    });
    var list = order.map(function (b) { return pages[b]; }).filter(function (p) {
      return p.title && p.loc.indexOf("tags/") !== 0;
    });
    var titles = {};
    list.forEach(function (p) { titles[p.loc] = p.title; });
    list.forEach(function (p) {
      var segs = p.loc.split("/").filter(Boolean);
      var crumb = [];
      for (var k = 1; k < segs.length; k++) {
        var anc = segs.slice(0, k).join("/") + "/";
        crumb.push(titles[anc] || pretty(segs[k - 1]));
      }
      p.path = crumb.join(" › ");
      p.nTitle = norm(p.title);
      p.nText = norm(p.text);
      p.heads.forEach(function (h) { h.nTitle = norm(h.title); h.nText = norm(h.text); });
    });

    // Articles only, like hooks/home.py: no home, about, tags, nor folder indexes (a loc that prefixes another).
    var locs = list.map(function (p) { return p.loc; });
    var known = articleLocs && articleLocs.reduce(function (m, l) { m[l] = 1; return m; }, {});
    var articles = list.filter(function (p) {
      if (known) return !!known[p.loc];
      return p.loc && p.loc !== "about/" && !locs.some(function (o) { return o !== p.loc && o.indexOf(p.loc) === 0; });
    });
    var secs = {}, tags = {};
    list.forEach(function (p) {
      var seg = p.loc.split("/")[0];
      if (seg && p.loc.indexOf("/") > 0) secs[seg] = secs[seg] || { seg: seg, count: 0 };
      (p.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    });
    articles.forEach(function (p) {
      var seg = p.loc.split("/")[0];
      if (secs[seg]) secs[seg].count++;
    });
    var sections = Object.keys(secs).map(function (s) {
      var t = titles[s + "/"] || pretty(s);
      return { seg: s, title: t, nTitle: norm(t), nSeg: norm(s), count: secs[s].count };
    }).sort(function (a, b) { return b.count - a.count; });
    var tagList = Object.keys(tags).map(function (t) { return { tag: t, nTag: norm(t), count: tags[t] }; });
    return { pages: list, sections: sections, tags: tagList, count: articles.length };
  }

  /* ---------- search ---------- */

  function snippet(text, nText, tokens) {
    var at = -1, tk = "";
    tokens.forEach(function (t) {
      var i = nText.indexOf(t);
      if (i >= 0 && (at < 0 || i < at)) { at = i; tk = t; }
    });
    if (at < 0) return null;
    var from = Math.max(0, at - 50), to = Math.min(text.length, at + tk.length + 90);
    return { pre: (from > 0 ? "… " : "") + text.slice(from, at), hit: text.slice(at, at + tk.length), post: text.slice(at + tk.length, to) + (to < text.length ? " …" : "") };
  }

  function searchPages(idx, tokens) {
    var out = [];
    idx.pages.forEach(function (p) {
      var score = 0, anchor = null, ex = null, ok = true;
      tokens.forEach(function (t) {
        var s = 0;
        if (p.nTitle.indexOf(t) >= 0) s = p.nTitle.indexOf(t) === 0 ? 120 : 100;
        else if (p.heads.some(function (h) { return h.nTitle.indexOf(t) >= 0; })) s = 40;
        else if (p.nText.indexOf(t) >= 0 || p.heads.some(function (h) { return h.nText.indexOf(t) >= 0; })) s = 10;
        if (!s) ok = false;
        score += s;
      });
      if (!ok) return;
      if (tokens.every(function (t) { return p.nTitle.indexOf(t) >= 0; })) score += 30;
      // Excerpt and deep link: prefer a heading that matches, then any text hit.
      var h = p.heads.filter(function (x) { return tokens.some(function (t) { return x.nTitle.indexOf(t) >= 0; }); })[0];
      if (h) anchor = h.anchor;
      ex = snippet(p.text, p.nText, tokens);
      if (!ex) {
        for (var i = 0; i < p.heads.length && !ex; i++) {
          ex = snippet(p.heads[i].text, p.heads[i].nText, tokens);
          if (ex && !anchor) anchor = p.heads[i].anchor;
        }
      }
      out.push({ page: p, score: score, anchor: anchor, ex: ex });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, MAX_PAGES);
  }

  /* ---------- actions ---------- */

  function actions() {
    var list = [];
    list.push({
      id: "theme", label: tr("jd.pal.act_theme"), key: MOD + "⇧L", words: tr("jd.pal.act_theme_words"),
      run: function () {
        var cur = document.body.getAttribute("data-md-color-scheme");
        var want = cur === "slate" ? "default" : "slate";
        var inputs = Array.prototype.slice.call(document.querySelectorAll('input[name="__palette"]'));
        var t = inputs.filter(function (i) { return i.getAttribute("data-md-color-scheme") === want && i.getAttribute("data-md-color-media") !== "(prefers-color-scheme)"; })[0];
        if (t) t.click();
      }
    });
    if (document.querySelector(".copy-llm-btn")) {
      list.push({
        id: "copy", label: tr("jd.pal.act_copy"), key: MOD + "⇧C", words: tr("jd.pal.act_copy_words"),
        run: function () { var b = document.querySelector(".copy-llm-btn"); if (b) b.click(); }
      });
    }
    var edit = document.querySelector('a[rel="edit"]');
    if (edit) {
      list.push({
        id: "edit", label: tr("jd.pal.act_edit"), key: "E", words: tr("jd.pal.act_edit_words"),
        run: function () { window.open(edit.href, "_blank", "noopener"); }
      });
    }
    return list;
  }

  /* ---------- UI ---------- */

  function build_ui() {
    var root = el("div", "jd-pal");
    root.id = "jd-pal";
    root.hidden = true;
    var scrim = el("div", "jd-pal__scrim");
    var dlg = el("div", "jd-pal__dlg");
    dlg.setAttribute("role", "dialog");
    dlg.setAttribute("aria-modal", "true");
    dlg.setAttribute("aria-label", tr("jd.pal.label"));

    var label = el("label", "jd-pal__in");
    var loupe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    loupe.setAttribute("viewBox", "0 0 24 24"); loupe.setAttribute("width", "20"); loupe.setAttribute("height", "20");
    loupe.setAttribute("fill", "none"); loupe.setAttribute("stroke", "currentColor"); loupe.setAttribute("stroke-width", "2");
    loupe.setAttribute("stroke-linecap", "round"); loupe.setAttribute("aria-hidden", "true");
    loupe.innerHTML = '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>';
    var sr = el("span", "jd-pal__sr", tr("jd.pal.search_label"));
    var input = el("input");
    input.type = "search";
    input.placeholder = tr("jd.pal.placeholder");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("enterkeyhint", "go");
    var esc = el("kbd", "jd-pal__esc", "esc");
    var cancel = el("button", "jd-pal__cancel", tr("jd.pal.cancel"));
    cancel.type = "button";
    label.appendChild(loupe); label.appendChild(sr); label.appendChild(input); label.appendChild(esc); label.appendChild(cancel);

    var list = el("div", "jd-pal__list");
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", tr("jd.pal.results"));

    var foot = el("div", "jd-pal__foot");
    function hint(k, t) {
      var s = el("span");
      s.appendChild(el("kbd", null, k));
      s.appendChild(document.createTextNode(" " + t));
      return s;
    }
    foot.appendChild(hint("↑↓", tr("jd.pal.hint_nav")));
    foot.appendChild(hint("↵", tr("jd.pal.hint_open")));
    foot.appendChild(hint(MOD + "↵", tr("jd.pal.hint_tab")));
    foot.appendChild(el("span", "jd-pal__spacer"));
    var count = el("span", "jd-pal__count");
    foot.appendChild(count);

    dlg.appendChild(label); dlg.appendChild(list); dlg.appendChild(foot);
    root.appendChild(scrim); root.appendChild(dlg);
    document.body.appendChild(root);

    scrim.addEventListener("click", close);
    cancel.addEventListener("click", close);
    input.addEventListener("input", render);
    list.addEventListener("mousemove", function (e) {
      var r = e.target.closest(".jd-pal__row");
      if (r) select(state.rows.indexOf(r), false);
    });
    list.addEventListener("click", function (e) {
      var r = e.target.closest(".jd-pal__row");
      if (!r) return;
      if (r.tagName === "A") {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        close(true);
      } else {
        e.preventDefault();
        activate(r, false);
      }
    });
    dlg.addEventListener("keydown", onKeys);
    return { root: root, input: input, list: list, count: count };
  }

  function group(label) {
    var p = el("p", "jd-pal__group", label);
    p.setAttribute("role", "presentation");
    ui.list.appendChild(p);
  }

  function addRow(row, a) {
    row.classList.add("jd-pal__row");
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", "false");
    ui.list.appendChild(row);
    state.rows.push(row);
    if (a) row._jd = a;
    return row;
  }
  function enter() { return el("kbd", "jd-pal__enter", "↵"); }

  function render() {
    var q = ui.input.value.trim();
    var tokens = norm(q).split(/\s+/).filter(Boolean);
    ui.list.textContent = "";
    state.rows = [];
    var idx = state.index;
    if (!idx) {
      ui.list.appendChild(el("p", "jd-pal__empty", tr("jd.pal.loading")));
      return;
    }
    ui.count.textContent = idx.count ? tr("jd.pal.indexed").replace("{n}", idx.count) : "";

    var any = false;
    if (tokens.length) {
      var found = searchPages(idx, tokens);
      if (found.length) {
        any = true;
        group(tr("jd.pal.group_pages"));
        found.forEach(function (r) {
          var a = el("a");
          a.href = url(r.page.loc + (r.anchor || ""));
          a.appendChild(svg(ICON_PAGE));
          var body = el("span", "jd-pal__body");
          body.appendChild(el("span", "jd-pal__title", r.page.title));
          if (r.page.path) body.appendChild(el("span", "jd-pal__path", r.page.path));
          if (r.ex) {
            var ex = el("span", "jd-pal__ex");
            ex.appendChild(document.createTextNode(r.ex.pre));
            ex.appendChild(el("mark", null, r.ex.hit));
            ex.appendChild(document.createTextNode(r.ex.post));
            body.appendChild(ex);
          }
          a.appendChild(body);
          a.appendChild(enter());
          addRow(a);
        });
      }
    }

    var secs = idx.sections.filter(function (s) {
      return !tokens.length || tokens.every(function (t) { return s.nTitle.indexOf(t) >= 0 || s.nSeg.indexOf(t) >= 0; });
    }).slice(0, tokens.length ? 3 : 8);
    var tags = tokens.length ? idx.tags.filter(function (t) {
      return tokens.every(function (k) { return t.nTag.indexOf(k) >= 0; });
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 3) : [];
    if (secs.length || tags.length) {
      any = true;
      group(tokens.length ? tr("jd.pal.group_sections_tags") : tr("jd.pal.group_sections"));
      secs.forEach(function (s) {
        var a = el("a"); a.href = url(s.seg + "/");
        a.appendChild(svg(ICON_FOLDER));
        var b = el("span", "jd-pal__body");
        var line = el("span", "jd-pal__line", s.title + " ");
        line.appendChild(el("span", "jd-pal__muted", "· " + tn("jd.count.article", s.count)));
        b.appendChild(line); a.appendChild(b); a.appendChild(enter());
        addRow(a);
      });
      tags.forEach(function (t) {
        var a = el("a"); a.href = url("tags/#tag:" + encodeURIComponent(t.tag.toLowerCase().replace(/\s+/g, "-")));
        a.appendChild(svg(ICON_TAG, true));
        var b = el("span", "jd-pal__body");
        var line = el("span", "jd-pal__line", tr("jd.pal.tag").replace("{tag}", t.tag) + " ");
        line.appendChild(el("span", "jd-pal__muted", "· " + tn("jd.count.article", t.count)));
        b.appendChild(line); a.appendChild(b); a.appendChild(enter());
        addRow(a);
      });
    }

    // Actions narrow down when the query matches one, otherwise all stay available.
    var all = actions();
    var acts = all.filter(function (a) {
      var hay = norm(a.label + " " + a.words);
      return tokens.length && tokens.every(function (t) { return hay.indexOf(t) >= 0; });
    });
    if (!acts.length) acts = all;
    if (acts.length) {
      any = true;
      group(tr("jd.pal.group_actions"));
      acts.forEach(function (a) {
        var b = el("button"); b.type = "button";
        b.appendChild(el("span", "jd-pal__chev", "›"));
        b.appendChild(el("span", "jd-pal__line", a.label));
        b.appendChild(el("kbd", "jd-pal__key", a.key));
        addRow(b, a);
      });
    }
    if (!any) {
      ui.list.appendChild(el("p", "jd-pal__empty", idx.failed ? tr("jd.pal.no_index") : tr("jd.pal.no_result").replace("{q}", q)));
    }
    select(0, true);
  }

  function select(i, scroll) {
    if (!state.rows.length) return;
    i = Math.max(0, Math.min(state.rows.length - 1, i));
    state.rows.forEach(function (r, k) {
      r.setAttribute("aria-selected", k === i ? "true" : "false");
    });
    state.sel = i;
    if (scroll) state.rows[i].scrollIntoView({ block: "nearest" });
  }

  function activate(row, newTab) {
    if (!row) return;
    if (row.tagName === "A") {
      if (newTab) { window.open(row.href, "_blank", "noopener"); return; }
      close(true);
      row.click();
    } else if (row._jd) {
      close(true);
      row._jd.run();
    }
  }

  function runAction(id) {
    var a = actions().filter(function (x) { return x.id === id; })[0];
    if (a) { close(true); a.run(); }
  }

  function onKeys(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); select(state.sel + 1, true); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); select(state.sel - 1, true); return; }
    if (e.key === "Tab") { e.preventDefault(); select(state.sel + (e.shiftKey ? -1 : 1), true); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      activate(state.rows[state.sel], e.metaKey || e.ctrlKey);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
      var k = e.key.toLowerCase();
      if (k === "l") { e.preventDefault(); runAction("theme"); }
      else if (k === "c") { e.preventDefault(); runAction("copy"); }
    }
  }

  function open(initial) {
    if (!ui || !document.body.contains(ui.root)) ui = build_ui();
    if (state.open) { ui.input.focus(); return; }
    state.open = true;
    state.lastFocus = document.activeElement;
    ui.root.hidden = false;
    document.documentElement.classList.add("jd-pal-open");
    ui.input.value = initial || "";
    render();
    ui.input.focus();
    loadIndex().then(function () { if (state.open) render(); });
  }

  function close(keepFocus) {
    if (!ui || !state.open) return;
    state.open = false;
    ui.root.hidden = true;
    document.documentElement.classList.remove("jd-pal-open");
    if (keepFocus !== true && state.lastFocus && state.lastFocus.focus) {
      try { state.lastFocus.focus(); } catch (e) { /* element gone */ }
    }
  }

  /* ---------- global wiring (once) ---------- */

  function typing(t) {
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  }

  window.addEventListener("keydown", function (e) {
    if (e.defaultPrevented) return;
    var k = e.key;
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && k.toLowerCase() === "k") {
      e.preventDefault(); e.stopImmediatePropagation();
      if (state.open) close(); else open();
      return;
    }
    if (state.open || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "/") {
      e.preventDefault(); e.stopImmediatePropagation();
      open();
    } else if (k === "e" || k === "E") {
      var a = document.querySelector('a[rel="edit"]');
      if (a) { e.preventDefault(); window.open(a.href, "_blank", "noopener"); }
    }
  }, true);

  // Header search field and mobile icon open the palette instead of Material's overlay.
  function hijack(e) {
    if (!e.target.closest) return;
    var hit = e.target.closest(".md-search__form, .md-search__input, .jd-search-toggle, label[for='__search']");
    if (!hit || e.target.closest(".md-search__output")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (e.type === "click") open();
  }
  document.addEventListener("mousedown", hijack, true);
  document.addEventListener("click", hijack, true);

  function init() {
    if (state.open) close(true);
    if (ui && !document.body.contains(ui.root)) ui = null;
    // Prefetch is lazy on purpose: the index is only fetched on first open.
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
