/* Inlines the SVG diagrams that opt in with data-jd-theme, so their var(--jd-*) colors resolve against
   the page and follow the light/dark toggle. As a plain <img> (RSS, no JS) they keep their fallbacks. */
(function () {
  var seq = 0;

  // Ids become document-wide once inlined: suffix them so two diagrams' markers cannot collide.
  function uniquifyIds(svg, n) {
    svg.querySelectorAll("[id]").forEach(function (el) {
      var id = el.id;
      var nid = id + "-jd" + n;
      el.id = nid;
      svg.querySelectorAll("*").forEach(function (node) {
        Array.prototype.forEach.call(node.attributes, function (a) {
          if (a.value === "#" + id) a.value = "#" + nid;
          else if (a.value.indexOf("url(#" + id + ")") !== -1) a.value = a.value.split("url(#" + id + ")").join("url(#" + nid + ")");
        });
      });
    });
  }

  function inline(img) {
    if (img.dataset.jdSvg) return;
    img.dataset.jdSvg = "1";
    var url = new URL(img.getAttribute("src"), document.baseURI);
    if (url.origin !== location.origin) return;
    fetch(url)
      .then(function (r) {
        return r.ok ? r.text() : Promise.reject(r.status);
      })
      .then(function (text) {
        var svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
        if (svg.nodeName !== "svg" || !svg.hasAttribute("data-jd-theme")) return;
        svg.querySelectorAll("script, foreignObject").forEach(function (n) {
          n.remove();
        });
        uniquifyIds(svg, ++seq);
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", img.getAttribute("alt") || "");
        var frame = img.closest("a.glightbox");
        if (frame) frame.classList.add("jd-svg-live");
        img.replaceWith(document.importNode(svg, true));
      })
      .catch(function () {});
  }

  function run() {
    document.querySelectorAll('.md-typeset img[src$=".svg"]').forEach(inline);
  }

  // The lightbox builds its own <img> from the link href when opened: inline that one too.
  new MutationObserver(function () {
    document.querySelectorAll('.gslide-image img[src$=".svg"]').forEach(inline);
  }).observe(document.body, { childList: true, subtree: true });

  if (window.document$) {
    window.document$.subscribe(run);
  } else {
    document.addEventListener("DOMContentLoaded", run);
  }
})();
