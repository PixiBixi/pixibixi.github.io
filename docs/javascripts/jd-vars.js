/* Page variables: front matter `variables:` (exposed as #jd-vars) substituted in code blocks at display time. */
(function () {
  "use strict";

  var KEY = "jd-vars";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(vals) {
    try { localStorage.setItem(KEY, JSON.stringify(vals)); } catch (e) { /* storage blocked */ }
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Text nodes of a code block with their offsets in the concatenated text.
  function textNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var list = [], pos = 0, n;
    while ((n = walker.nextNode())) {
      list.push({ node: n, text: n.nodeValue, start: pos });
      pos += n.nodeValue.length;
    }
    return { list: list, full: list.map(function (t) { return t.text; }).join("") };
  }

  // Placeholders may be split across highlight spans: match over the whole text, patch per node.
  function prepare(code, re) {
    var t = textNodes(code), matches = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(t.full))) matches.push({ start: m.index, end: m.index + m[0].length, name: m[1] });
    if (!matches.length) return null;
    var slots = [];
    t.list.forEach(function (tn) {
      var end = tn.start + tn.text.length;
      var hit = matches.some(function (x) { return x.start < end && x.end > tn.start; });
      if (!hit) return;
      var wrap = document.createElement("span");
      wrap.className = "jd-vars__seg";
      tn.node.parentNode.replaceChild(wrap, tn.node);
      slots.push({ wrap: wrap, text: tn.text, start: tn.start, end: end });
    });
    return { slots: slots, matches: matches };
  }

  function render(block, ctx) {
    block.slots.forEach(function (s) {
      var frag = document.createDocumentFragment(), cur = s.start;
      function plain(to) {
        if (to > cur) frag.appendChild(document.createTextNode(s.text.slice(cur - s.start, to - s.start)));
        cur = Math.max(cur, to);
      }
      block.matches.forEach(function (m) {
        if (m.end <= s.start || m.start >= s.end) return;
        plain(Math.max(m.start, s.start));
        if (m.start >= s.start) {
          var v = ctx.vars[m.name], val = ctx.values[m.name];
          if (val === "" || val == null) {
            frag.appendChild(document.createTextNode("<" + m.name + ">"));
          } else {
            var el = document.createElement("span");
            el.className = "jd-var" + (val !== v.default ? " jd-var--set" : "");
            el.title = m.name;
            el.textContent = val;
            frag.appendChild(el);
          }
        }
        cur = Math.max(cur, Math.min(m.end, s.end));
      });
      plain(s.end);
      s.wrap.replaceChildren(frag);
    });
  }

  function init() {
    var holder = document.getElementById("jd-vars");
    if (!holder) return;
    var decl;
    try { decl = JSON.parse(holder.textContent); } catch (e) { return; }
    var vars = {};
    (decl || []).forEach(function (d) {
      if (d && d.name) vars[d.name] = { name: d.name, default: d.default == null ? "" : String(d.default) };
    });
    var names = Object.keys(vars);
    if (!names.length) return;

    var re = new RegExp("<(" + names.map(esc).join("|") + ")>", "g");
    var blocks = [], first = null;
    document.querySelectorAll(".md-typeset .highlight code").forEach(function (code) {
      var b = prepare(code, re);
      if (!b) return;
      blocks.push(b);
      if (!first) first = code.closest(".highlight");
    });
    if (!first) return;

    var used = {};
    blocks.forEach(function (b) { b.matches.forEach(function (m) { used[m.name] = true; }); });
    var stored = load(), values = {};
    names.forEach(function (n) { values[n] = stored[n] != null ? stored[n] : vars[n].default; });
    var ctx = { vars: vars, values: values };

    var bar = document.createElement("div");
    bar.className = "jd-vars";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Variables de la page");
    bar.innerHTML = '<span class="jd-vars__title"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v2c0 2-1 3-3 3"/></svg>Variables</span>';
    var inputs = {};

    function renderAll() { blocks.forEach(function (b) { render(b, ctx); }); }
    function sync() {
      names.forEach(function (n) {
        if (inputs[n]) inputs[n].classList.toggle("jd-vars__input--set", values[n] !== vars[n].default);
      });
    }
    function persist() {
      var out = load();
      names.forEach(function (n) {
        if (values[n] !== vars[n].default) out[n] = values[n]; else delete out[n];
      });
      save(out);
    }
    function changed() { renderAll(); sync(); persist(); }

    names.filter(function (n) { return used[n]; }).forEach(function (n) {
      var label = document.createElement("label");
      label.className = "jd-vars__field";
      var name = document.createElement("span");
      name.textContent = n;
      var input = document.createElement("input");
      input.type = "text";
      input.value = values[n];
      input.placeholder = vars[n].default;
      input.spellcheck = false;
      input.autocomplete = "off";
      input.autocapitalize = "off";
      // Fallback for browsers without field-sizing: grow with the value.
      function fit() { input.size = Math.max(12, input.value.length + 1); }
      fit();
      input.addEventListener("input", function () { values[n] = input.value; fit(); changed(); });
      inputs[n] = input;
      label.appendChild(name);
      label.appendChild(input);
      bar.appendChild(label);
    });

    var spacer = document.createElement("span");
    spacer.className = "jd-vars__spacer";
    var reset = document.createElement("button");
    reset.type = "button";
    reset.className = "jd-vars__reset";
    reset.textContent = "Réinitialiser";
    reset.addEventListener("click", function () {
      names.forEach(function (n) {
        values[n] = vars[n].default;
        if (inputs[n]) { inputs[n].value = values[n]; inputs[n].dispatchEvent(new Event("input")); }
      });
      changed();
    });
    bar.appendChild(spacer);
    bar.appendChild(reset);

    var note = document.createElement("p");
    note.className = "jd-vars__note";
    note.textContent = "Les variables s'appliquent à tous les blocs de la page et sont mémorisées dans le navigateur pour tout le wiki.";

    first.parentNode.insertBefore(bar, first);
    first.parentNode.insertBefore(note, first.nextSibling);
    renderAll();
    sync();
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
