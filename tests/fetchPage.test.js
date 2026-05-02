/**
 * Tests for src/fetchPage.js
 *
 * Mocks axios so no real HTTP requests are made.
 * Uses realistic TLDR page HTML to verify the Cheerio selectors.
 */

import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// --- mock axios before importing the module under test ---
const mockAxiosGet = mock.fn();
mock.module("axios", {
  exports: {
    default: { get: mockAxiosGet },
  },
});

const { fetchPage } = await import("../src/fetchPage.js");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Minimal but realistic TLDR page HTML matching the actual site structure.
 */
const TLDR_PAGE_HTML = `<!DOCTYPE html>
<html>
<body>
  <section>
    <header>
      <div class="text-center text-3xl mt-3">📱</div>
      <h3 class="text-center font-bold">Big Tech &amp; Startups</h3>
    </header>
    <article class="mt-3">
      <a class="font-bold" href="https://example.com/article-1" target="_blank" rel="noopener noreferrer">
        <h3>First Article Title (3 minute read)</h3>
      </a>
      <div class="newsletter-html">Summary of the first article.</div>
    </article>
    <article class="mt-3">
      <a class="font-bold" href="https://example.com/article-2" target="_blank" rel="noopener noreferrer">
        <h3>Second Article Title (5 minute read)</h3>
      </a>
      <div class="newsletter-html">Summary of the second article with a <a href="https://example.com/more">link</a>.</div>
    </article>
  </section>
  <section>
    <header>
      <div class="text-center text-3xl mt-3">💻</div>
      <h3 class="text-center font-bold">Programming, Design &amp; Data Science</h3>
    </header>
    <article class="mt-3">
      <a class="font-bold" href="https://example.com/article-3" target="_blank" rel="noopener noreferrer">
        <h3>Third Article Title (10 minute read)</h3>
      </a>
      <div class="newsletter-html">Summary of the third article.</div>
    </article>
  </section>
  <section>
    <header>
      <h3 class="text-center font-bold">Empty Section</h3>
    </header>
    <!-- no articles -->
  </section>
</body>
</html>`;

/** Page with no matching article structure at all */
const EMPTY_PAGE_HTML = `<!DOCTYPE html><html><body><p>Nothing here</p></body></html>`;

/** Page where newsletter-html contains inner links */
const PAGE_WITH_INNER_LINKS = `<!DOCTYPE html>
<html><body>
  <section>
    <header><h3 class="text-center font-bold">Quick Links</h3></header>
    <article class="mt-3">
      <a class="font-bold" href="https://example.com/ql-1">
        <h3>Quick Link Article</h3>
      </a>
      <div class="newsletter-html">Read more at <a href="https://example.com/detail" rel="noopener noreferrer" target="_blank">this page</a>.</div>
    </article>
  </section>
</body></html>`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchPage", () => {
  beforeEach(() => {
    mockAxiosGet.mock.resetCalls();
  });

  it("extracts sections and articles from a TLDR page", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: TLDR_PAGE_HTML }));

    const { sections } = await fetchPage("https://tldr.tech/tech/2026-05-01");

    // Empty section should be filtered out
    assert.equal(sections.length, 2);

    assert.equal(sections[0].heading, "Big Tech & Startups");
    assert.equal(sections[0].articles.length, 2);

    assert.equal(sections[1].heading, "Programming, Design & Data Science");
    assert.equal(sections[1].articles.length, 1);
  });

  it("extracts correct title and url from each article", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: TLDR_PAGE_HTML }));

    const { sections } = await fetchPage("https://tldr.tech/tech/2026-05-01");

    const first = sections[0].articles[0];
    assert.equal(first.title, "First Article Title (3 minute read)");
    assert.equal(first.url, "https://example.com/article-1");

    const second = sections[0].articles[1];
    assert.equal(second.title, "Second Article Title (5 minute read)");
    assert.equal(second.url, "https://example.com/article-2");
  });

  it("preserves inner HTML of newsletter-html including nested links", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: PAGE_WITH_INNER_LINKS }));

    const { sections } = await fetchPage("https://tldr.tech/tech/2026-05-01");

    const article = sections[0].articles[0];
    // The inner link should be preserved in contentHtml
    assert.match(article.contentHtml, /href="https:\/\/example\.com\/detail"/);
    assert.match(article.contentHtml, /this page/);
  });

  it("returns a fallback rawHtml when no articles are found", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: EMPTY_PAGE_HTML }));

    const { sections, rawHtml } = await fetchPage("https://tldr.tech/tech/2026-05-01");

    assert.equal(sections.length, 0);
    assert.match(rawHtml, /No articles extracted/);
    assert.match(rawHtml, /View the full digest online/);
  });

  it("rawHtml contains section headings and article links", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: TLDR_PAGE_HTML }));

    const { rawHtml } = await fetchPage("https://tldr.tech/tech/2026-05-01");

    assert.match(rawHtml, /<h2>Big Tech &amp; Startups<\/h2>/);
    assert.match(rawHtml, /<h2>Programming, Design &amp; Data Science<\/h2>/);
    assert.match(rawHtml, /href="https:\/\/example\.com\/article-1"/);
    assert.match(rawHtml, /First Article Title/);
    assert.match(rawHtml, /View full digest online/);
  });

  it("rawHtml includes a link back to the source page", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: TLDR_PAGE_HTML }));

    const sourceUrl = "https://tldr.tech/tech/2026-05-01";
    const { rawHtml } = await fetchPage(sourceUrl);

    assert.match(rawHtml, new RegExp(sourceUrl.replace(/\//g, "\\/")));
  });

  it("skips sections with no articles", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: TLDR_PAGE_HTML }));

    const { sections } = await fetchPage("https://tldr.tech/tech/2026-05-01");

    const headings = sections.map((s) => s.heading);
    assert.ok(!headings.includes("Empty Section"));
  });

  it("passes correct headers to axios", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: TLDR_PAGE_HTML }));

    await fetchPage("https://tldr.tech/tech/2026-05-01");

    const [, opts] = mockAxiosGet.mock.calls[0].arguments;
    assert.equal(opts.headers.Accept, "text/html");
    assert.match(opts.headers["User-Agent"], /rss-reformatter/);
  });
});
