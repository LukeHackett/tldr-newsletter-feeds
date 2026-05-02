/**
 * Tests for src/writeFeed.js
 *
 * Mocks fs so no files are written to disk.
 * Captures the generated RSS/Atom XML strings and asserts on their content.
 */

import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// --- mock fs before importing the module under test ---
const mockMkdirSync = mock.fn();
const mockWriteFileSync = mock.fn();

mock.module("fs", {
  exports: {
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
  },
});

const { writeFeed } = await import("../src/writeFeed.js");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_OPTS = {
  title: "TLDR Tech – Daily Digest",
  description: "Full daily digest from TLDR Tech.",
  siteUrl: "https://tldr.tech/tech",
  outputDir: "/tmp/test-output/tldr/tech",
  feedBaseUrl: "https://example.github.io/feeds/tldr/tech",
  items: [
    {
      title: "Day one digest",
      link: "https://tldr.tech/tech/2026-05-01",
      pubDate: "Thu, 01 May 2026 00:00:00 GMT",
      contentHtml: "<h2>Big Tech</h2><p>Some content here.</p>",
      summary: "Article A · Article B · Article C",
    },
    {
      title: "Day two digest",
      link: "https://tldr.tech/tech/2026-04-30",
      pubDate: "Wed, 30 Apr 2026 00:00:00 GMT",
      contentHtml: "<h2>Programming</h2><p>More content.</p>",
      summary: "Article D · Article E",
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the XML string written for a given filename suffix */
function getCapturedXml(suffix) {
  const call = mockWriteFileSync.mock.calls.find(({ arguments: [p] }) =>
    p.endsWith(suffix)
  );
  assert.ok(call, `Expected a writeFileSync call for *${suffix}`);
  return call.arguments[1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("writeFeed", () => {
  beforeEach(() => {
    mockMkdirSync.mock.resetCalls();
    mockWriteFileSync.mock.resetCalls();
  });

  it("creates the output directory", () => {
    writeFeed(BASE_OPTS);
    assert.equal(mockMkdirSync.mock.calls.length, 1);
    const [dir, opts] = mockMkdirSync.mock.calls[0].arguments;
    assert.equal(dir, BASE_OPTS.outputDir);
    assert.deepEqual(opts, { recursive: true });
  });

  it("writes both feed.rss and feed.atom files", () => {
    writeFeed(BASE_OPTS);
    const paths = mockWriteFileSync.mock.calls.map((c) => c.arguments[0]);
    assert.ok(paths.some((p) => p.endsWith("feed.rss")));
    assert.ok(paths.some((p) => p.endsWith("feed.atom")));
    assert.ok(paths.some((p) => p.endsWith("feed.json")));
  });

  it("returns the rssPath, atomPath and jsonPath", () => {
    const result = writeFeed(BASE_OPTS);
    assert.ok(result.rssPath.endsWith("feed.rss"));
    assert.ok(result.atomPath.endsWith("feed.atom"));
    assert.ok(result.jsonPath.endsWith("feed.json"));
  });

  it("RSS output contains feed title and item titles", () => {
    writeFeed(BASE_OPTS);
    const rss = getCapturedXml("feed.rss");
    assert.match(rss, /TLDR Tech.*Daily Digest/);
    assert.match(rss, /Day one digest/);
    assert.match(rss, /Day two digest/);
  });

  it("RSS output contains item links", () => {
    writeFeed(BASE_OPTS);
    const rss = getCapturedXml("feed.rss");
    assert.match(rss, /tldr\.tech\/tech\/2026-05-01/);
    assert.match(rss, /tldr\.tech\/tech\/2026-04-30/);
  });

  it("RSS output contains content:encoded with the full HTML", () => {
    writeFeed(BASE_OPTS);
    const rss = getCapturedXml("feed.rss");
    assert.match(rss, /content:encoded/);
    assert.match(rss, /Big Tech/);
    assert.match(rss, /Some content here/);
  });

  it("Atom output contains feed title and item titles", () => {
    writeFeed(BASE_OPTS);
    const atom = getCapturedXml("feed.atom");
    assert.match(atom, /TLDR Tech.*Daily Digest/);
    assert.match(atom, /Day one digest/);
  });

  it("Atom output contains self-referencing feed links", () => {
    writeFeed(BASE_OPTS);
    const atom = getCapturedXml("feed.atom");
    assert.match(atom, /feed\.atom/);
  });

  it("JSON Feed output is valid JSON", () => {
    writeFeed(BASE_OPTS);
    const json = getCapturedXml("feed.json");
    assert.doesNotThrow(() => JSON.parse(json));
  });

  it("JSON Feed output contains feed title and item titles", () => {
    writeFeed(BASE_OPTS);
    const json = JSON.parse(getCapturedXml("feed.json"));
    assert.match(json.title, /TLDR Tech/);
    assert.equal(json.items.length, 2);
    assert.equal(json.items[0].title, "Day one digest");
    assert.equal(json.items[1].title, "Day two digest");
  });

  it("JSON Feed output contains item links and content_html", () => {
    writeFeed(BASE_OPTS);
    const json = JSON.parse(getCapturedXml("feed.json"));
    assert.equal(json.items[0].url, "https://tldr.tech/tech/2026-05-01");
    assert.match(json.items[0].content_html, /Big Tech/);
  });

  it("JSON Feed output includes self-referencing feed_url", () => {
    writeFeed(BASE_OPTS);
    const json = JSON.parse(getCapturedXml("feed.json"));
    assert.match(json.feed_url, /feed\.json/);
  });

  it("handles an empty items array without throwing", () => {
    assert.doesNotThrow(() =>
      writeFeed({ ...BASE_OPTS, items: [] })
    );
    const rss = getCapturedXml("feed.rss");
    assert.match(rss, /TLDR Tech/);
  });

  it("uses the feedBaseUrl for self-link hrefs", () => {
    writeFeed(BASE_OPTS);
    const rss = getCapturedXml("feed.rss");
    assert.match(rss, /example\.github\.io\/feeds\/tldr\/tech/);
  });
});
