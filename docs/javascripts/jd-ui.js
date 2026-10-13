/* Theme UI glue: closes the mobile "Sur cette page" panel on link click, Esc or outside click. */
(function () {
  "use strict";

  function bar() { return document.querySelector(".jd-toc-bar"); }

  // Caption bar: "lang" alone, or "lang · title" when the fence has a title= (as in the mock).
  function captions() {
    document.querySelectorAll(".md-typeset .highlight").forEach(function (box) {
      if (box.closest(".tabbed-set")) return;
      var lang = Array.from(box.classList).find(function (c) { return c.indexOf("language-") === 0; });
      if (!lang) return;
      lang = lang.replace("language-", "");
      var bar = box.querySelector(".filename");
      if (bar) {
        if (!bar.dataset.jdLang && lang !== "text") {
          bar.dataset.jdLang = "1";
          bar.textContent = lang + " \u00b7 " + bar.textContent;
        }
        return;
      }
      bar = document.createElement("span");
      bar.className = "filename";
      bar.textContent = lang;
      box.insertBefore(bar, box.firstChild);
    });
  }

  // Break the H1 after "/" instead of mid-word (Chrome offers no break opportunity there).
  function titleBreaks() {
    var h = document.querySelector(".md-typeset h1");
    var t = h && h.firstChild;
    if (!t || t.nodeType !== 3 || h.dataset.jdWbr) return;
    h.dataset.jdWbr = "1";
    var parts = t.nodeValue.split("/");
    var frag = document.createDocumentFragment();
    parts.forEach(function (x, i) {
      if (i) { frag.appendChild(document.createTextNode("/")); frag.appendChild(document.createElement("wbr")); }
      frag.appendChild(document.createTextNode(x));
    });
    h.replaceChild(frag, t);
  }

  // Drawer theme buttons: active = the palette option Material left visible in the header.
  function themeState() {
    var seg = document.querySelector(".jd-seg:not([hidden])");
    var idx = seg ? String(Array.from(document.querySelectorAll(".jd-seg")).indexOf(seg)) : null;
    document.querySelectorAll(".jd-drawer-theme label").forEach(function (l) {
      l.classList.toggle("is-active", l.dataset.jdIdx === idx);
    });
  }

  // Sidebar fade under the sticky section title: only while the scroll container is scrolled.
  function navScroll() {
    document.querySelectorAll(".md-sidebar__scrollwrap").forEach(function (w) {
      w.classList.toggle("jd-scrolled", w.scrollTop > 0);
    });
  }

  // Right TOC fold: the class lives on <html> so it survives instant navigation, the choice in localStorage.
  var FOLD_KEY = "jd-toc-folded";
  function tocFold() {
    var side = document.querySelector(".md-sidebar--secondary");
    if (!side || side.querySelector(".jd-toc-fold")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jd-toc-fold";
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var sync = function () {
      var folded = document.documentElement.classList.contains("jd-toc-folded");
      btn.setAttribute("aria-expanded", String(!folded));
      btn.setAttribute("aria-label", folded ? "Afficher le sommaire" : "Masquer le sommaire");
      btn.title = btn.getAttribute("aria-label");
    };
    btn.addEventListener("click", function () {
      var folded = document.documentElement.classList.toggle("jd-toc-folded");
      try { localStorage.setItem(FOLD_KEY, folded ? "1" : "0"); } catch (e) { /* private mode */ }
      sync();
    });
    sync();
    side.insertBefore(btn, side.firstChild);
  }
  try {
    if (localStorage.getItem(FOLD_KEY) === "1") document.documentElement.classList.add("jd-toc-folded");
  } catch (e) { /* private mode */ }

  function init() {
    tocFold();
    navScroll();
    captions();
    titleBreaks();
    themeState();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }

  document.addEventListener("scroll", function (e) {
    var w = e.target;
    if (w && w.classList && w.classList.contains("md-sidebar__scrollwrap")) {
      w.classList.toggle("jd-scrolled", w.scrollTop > 0);
    }
  }, true);

  document.addEventListener("click", function (e) {
    if (e.target.closest(".jd-drawer-theme")) setTimeout(themeState, 50);
  });

  document.addEventListener("click", function (e) {
    var b = bar();
    if (!b || !b.open) return;
    if (e.target.closest(".jd-toc-bar__panel a") || !e.target.closest(".jd-toc-bar summary, .jd-toc-bar__panel")) {
      b.open = false;
    }
  });

  document.addEventListener("keydown", function (e) {
    var b = bar();
    if (e.key === "Escape" && b && b.open) b.open = false;
  });
})();
