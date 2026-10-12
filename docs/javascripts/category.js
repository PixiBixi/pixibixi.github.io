/* Generated folder index: client-side filter (text + tag) and sort.
   State stays in the page, never in the URL: filtered views must not be indexable. */
(function () {
  function fold(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function init() {
    var root = document.querySelector("[data-jd-cat]");
    if (!root || root.dataset.jdReady) return;
    root.dataset.jdReady = "1";

    var input = root.querySelector("[data-jd-filter]");
    var chips = root.querySelectorAll("[data-jd-tag]");
    var sorts = root.querySelectorAll("[data-jd-sort]");
    var lists = root.querySelectorAll("[data-jd-list]");
    var empty = root.querySelector("[data-jd-empty]");
    var state = { q: "", tag: "", sort: "az" };

    function apply() {
      var q = fold(state.q).trim();
      var shown = 0;
      lists.forEach(function (list) {
        var items = Array.prototype.slice.call(list.children);
        items.sort(function (a, b) {
          if (state.sort === "recent") {
            var d = (b.dataset.jdDate || "").localeCompare(a.dataset.jdDate || "");
            if (d) return d;
          }
          return a.dataset.jdTitle.localeCompare(b.dataset.jdTitle, "fr", { sensitivity: "base" });
        });
        var visible = 0;
        items.forEach(function (el) {
          var tags = (el.dataset.jdTags || "").split("|");
          var ok = (!q || fold(el.dataset.jdText).indexOf(q) !== -1) &&
            (!state.tag || tags.indexOf(state.tag) !== -1);
          el.hidden = !ok;
          if (ok) visible++;
          list.appendChild(el);
        });
        var group = list.closest("[data-jd-group]");
        if (group) group.hidden = visible === 0;
        else list.hidden = visible === 0;
        shown += visible;
      });
      if (empty) empty.hidden = shown !== 0;
    }

    function press(nodes, current) {
      nodes.forEach(function (n) {
        n.setAttribute("aria-pressed", n === current ? "true" : "false");
      });
    }

    if (input) {
      input.addEventListener("input", function () {
        state.q = input.value;
        apply();
      });
    }
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.tag = chip.dataset.jdTag;
        press(chips, chip);
        apply();
      });
    });
    sorts.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.sort = btn.dataset.jdSort;
        press(sorts, btn);
        apply();
      });
    });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
