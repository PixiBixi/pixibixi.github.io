/* abbr[title] tooltips: hover/focus on desktop, tap to open and tap elsewhere to close on touch. */
(function () {
  "use strict";

  var tip = null, current = null, shownAt = 0;

  function ensure() {
    if (tip && document.body.contains(tip)) return tip;
    tip = document.createElement("span");
    tip.className = "jd-tip";
    tip.id = "jd-tip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);
    return tip;
  }

  function hide() {
    if (!tip) return;
    tip.hidden = true;
    if (current) current.removeAttribute("aria-describedby");
    current = null;
  }

  function show(a) {
    var t = ensure();
    if (current === a && !t.hidden) return;
    hide();
    var strong = document.createElement("strong");
    strong.textContent = a.textContent;
    t.textContent = "";
    t.appendChild(strong);
    t.appendChild(document.createTextNode(" · " + a.getAttribute("data-jd-tip")));
    t.hidden = false;
    t.style.left = "0px";
    t.style.top = "0px";
    var r = a.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, vw = document.documentElement.clientWidth;
    var left = Math.max(16, Math.min(vw - w - 16, r.left + r.width / 2 - w / 2));
    var above = r.top - h - 10 >= 8;
    t.classList.toggle("jd-tip--below", !above);
    t.style.left = left + "px";
    t.style.top = (above ? r.top - h - 10 : r.bottom + 10) + "px";
    t.style.setProperty("--jd-tip-x", Math.round(r.left + r.width / 2 - left) + "px");
    a.setAttribute("aria-describedby", "jd-tip");
    current = a;
    shownAt = Date.now();
  }

  function target(e) {
    return e.target.closest ? e.target.closest("abbr[data-jd-tip]") : null;
  }

  document.addEventListener("click", function (e) {
    var a = target(e);
    if (a) {
      var hover = window.matchMedia("(hover: hover)").matches;
      // A tap focuses the abbr first (opening the tip): do not toggle it back off.
      var fresh = Date.now() - shownAt < 500;
      if (!hover && !fresh && current === a && tip && !tip.hidden) hide(); else show(a);
    } else {
      hide();
    }
  });
  document.addEventListener("mouseover", function (e) {
    var a = target(e);
    if (a && window.matchMedia("(hover: hover)").matches) show(a);
  });
  document.addEventListener("mouseout", function (e) {
    var a = target(e);
    if (a && a === current && window.matchMedia("(hover: hover)").matches) hide();
  });
  document.addEventListener("focusin", function (e) { var a = target(e); if (a) show(a); });
  document.addEventListener("focusout", function (e) { if (target(e)) hide(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);

  function init() {
    hide();
    var seen = {};
    document.querySelectorAll(".md-typeset abbr[title]").forEach(function (a) {
      var key = a.textContent.trim().toLowerCase();
      if (!seen[key]) { seen[key] = true; a.classList.add("jd-abbr--first"); }
      a.setAttribute("data-jd-tip", a.getAttribute("title"));
      a.removeAttribute("title");
      if (!a.hasAttribute("tabindex")) a.setAttribute("tabindex", "0");
    });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
