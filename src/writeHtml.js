/**
 * Generates a simple HTML index page at the docs root listing all available
 * feeds with links to their RSS, Atom, and JSON Feed files.
 */

import fs from "fs";
import path from "path";

/**
 * @param {object} opts
 * @param {string} opts.outputDir   - Absolute path to the docs root directory
 * @param {string} opts.feedBaseUrl - Base URL where feeds are hosted (GitHub Pages)
 * @param {Array}  opts.feeds       - Feed config entries from config.js
 * @param {Date}   opts.builtAt     - Timestamp to show in the page footer
 * @returns {{ htmlPath: string }}
 */
export function writeHtml({ outputDir, feedBaseUrl, feeds, builtAt = new Date() }) {
  const feedRows = feeds
    .map(({ title, description, outputDir: feedDir }) => {
      const base = `${feedBaseUrl}/${feedDir}`;
      return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      <ul>
        <li><a href="${base}/feed.rss">RSS 2.0</a></li>
        <li><a href="${base}/feed.atom">Atom 1.0</a></li>
        <li><a href="${base}/feed.json">JSON Feed</a></li>
      </ul>
    </section>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TLDR Feed Reader</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      max-width: 48rem;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #1a1a1a;
      line-height: 1.6;
    }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.1rem; margin: 0 0 0.25rem; }
    header p { color: #555; margin-top: 0; }
    section {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    section p { margin: 0 0 0.5rem; color: #555; font-size: 0.9rem; }
    ul { margin: 0; padding: 0; list-style: none; display: flex; gap: 1rem; }
    a { color: #0066cc; text-decoration: none; font-size: 0.9rem; }
    a:hover { text-decoration: underline; }
    footer { margin-top: 2rem; font-size: 0.8rem; color: #888; }
  </style>
</head>
<body>
  <header>
    <h1>TLDR Feed Reader</h1>
    <p>Enriched daily digests from <a href="https://tldr.tech">tldr.tech</a>, available in RSS, Atom, and JSON Feed formats.</p>
  </header>
  <main>
${feedRows}
  </main>
  <footer>
    <p>Last built: ${escapeHtml(builtAt.toUTCString())}</p>
  </footer>
</body>
</html>`;

  fs.mkdirSync(outputDir, { recursive: true });

  const htmlPath = path.join(outputDir, "index.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  return { htmlPath };
}

/**
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
