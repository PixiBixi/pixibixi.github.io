/**
 * "Copy for LLM" button — copies article content as clean Markdown
 * so LLMs (and humans prompting them) can cite this wiki as a source.
 */
(function () {
  "use strict";

  function htmlToMarkdown(el) {
    var out = "";
    el.childNodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      var tag = node.tagName;

      // Skip hidden elements, nav, buttons, copy-llm itself
      if (node.hidden || node.classList.contains("copy-llm-btn")) return;

      // Headers
      var hMatch = tag.match(/^H([1-6])$/);
      if (hMatch) {
        var level = "#".repeat(parseInt(hMatch[1]));
        out += "\n\n" + level + " " + node.textContent.replace(/\s*¶\s*$/, "").trim() + "\n\n";
        return;
      }

      // Code blocks
      if (tag === "PRE") {
        var code = node.querySelector("code");
        var lang = "";
        if (code) {
          var cls = Array.from(code.classList).find(function (c) {
            return c.startsWith("language-");
          });
          if (cls) lang = cls.replace("language-", "");
        }
        out += "\n\n```" + lang + "\n" + node.textContent.trimEnd() + "\n```\n\n";
        return;
      }

      // Inline code
      if (tag === "CODE") {
        out += "`" + node.textContent + "`";
        return;
      }

      // Links
      if (tag === "A") {
        if (node.classList.contains("headerlink")) return;
        var href = node.getAttribute("href") || "";
        // Make relative URLs absolute
        if (href && !href.startsWith("http") && !href.startsWith("#")) {
          try { href = new URL(href, window.location.href).href; } catch (e) { /* keep as-is */ }
        }
        var text = node.textContent.trim();
        if (href && text) {
          out += "[" + text + "](" + href + ")";
        } else {
          out += text;
        }
        return;
      }

      // Bold / italic
      if (tag === "STRONG" || tag === "B") {
        out += "**" + htmlToMarkdown(node) + "**";
        return;
      }
      if (tag === "EM" || tag === "I") {
        out += "*" + htmlToMarkdown(node) + "*";
        return;
      }

      // Lists
      if (tag === "UL" || tag === "OL") {
        out += "\n";
        var items = node.querySelectorAll(":scope > li");
        items.forEach(function (li, i) {
          var prefix = tag === "OL" ? (i + 1) + ". " : "- ";
          out += prefix + htmlToMarkdown(li).trim().replace(/\n/g, "\n  ") + "\n";
        });
        out += "\n";
        return;
      }
      if (tag === "LI") {
        out += htmlToMarkdown(node);
        return;
      }

      // Paragraphs and divs
      if (tag === "P") {
        out += "\n\n" + htmlToMarkdown(node).trim() + "\n\n";
        return;
      }

      // Admonitions — keep title + content
      if (node.classList.contains("admonition")) {
        var title = node.querySelector(".admonition-title");
        var titleText = title ? title.textContent.trim() : "Note";
        out += "\n\n> **" + titleText + "**\n";
        node.childNodes.forEach(function (child) {
          if (child === title) return;
          var inner = htmlToMarkdown(child).trim();
          if (inner) out += "> " + inner.replace(/\n/g, "\n> ") + "\n";
        });
        out += "\n";
        return;
      }

      // Tables
      if (tag === "TABLE") {
        var rows = node.querySelectorAll("tr");
        rows.forEach(function (tr, ri) {
          var cells = tr.querySelectorAll("th, td");
          var line = "| " + Array.from(cells).map(function (c) {
            return c.textContent.trim();
          }).join(" | ") + " |";
          out += line + "\n";
          if (ri === 0) {
            out += "| " + Array.from(cells).map(function () { return "---"; }).join(" | ") + " |\n";
          }
        });
        out += "\n";
        return;
      }

      // Fallback: recurse
      out += htmlToMarkdown(node);
    });
    return out;
  }

  function buildLlmText() {
    var content = document.querySelector(".md-content__inner");
    if (!content) return null;

    // Clone to avoid mutating the DOM
    var clone = content.cloneNode(true);

    // Remove elements that aren't article content
    clone.querySelectorAll([
      ".md-content__button",   // edit button
      ".md-source-file",       // git dates footer
      ".md-tags",              // tags
      "script",
      "style",
      ".copy-llm-btn",
      ".headerlink"
    ].join(",")).forEach(function (el) { el.remove(); });

    var title = document.querySelector("h1");
    var titleText = title ? title.textContent.replace(/\s*¶\s*$/, "").trim() : document.title;

    var md = htmlToMarkdown(clone).replace(/\n{3,}/g, "\n\n").trim();

    return "# " + titleText + "\n\nSource: " + window.location.href + "\n\n" + md;
  }

  function init() {
    // Don't add on homepage
    if (document.querySelector(".md-content__inner > .md-content__button") === null &&
        document.querySelector("article h1") === null) return;

    var target = document.querySelector(".md-content__inner");
    if (!target) return;

    var btn = document.createElement("button");
    btn.className = "copy-llm-btn md-content__button md-icon";
    btn.title = "Copier le contenu en Markdown pour utilisation dans un LLM";
    btn.setAttribute("aria-label", "Copier pour LLM");
    // Robot/AI icon (Material Design "smart_toy")
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">' +
      '<path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2' +
      'c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34' +
      ' 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5' +
      '-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67' +
      ' 1.5 1.5S15.83 13 15 13z"/></svg>';

    btn.addEventListener("click", function () {
      var text = buildLlmText();
      if (!text) return;

      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add("copy-llm-btn--done");
        btn.title = "Copied!";
        setTimeout(function () {
          btn.classList.remove("copy-llm-btn--done");
          btn.title = "Copy for LLM";
        }, 2000);
      });
    });

    // Insert as first child (before edit button)
    target.insertBefore(btn, target.firstChild);
  }

  // MkDocs Material uses instant loading — re-init on navigation
  if (typeof document$ !== "undefined") {
    document$.subscribe(function () { init(); });
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
