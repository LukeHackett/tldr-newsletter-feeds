/**
 * Tests for src/fetchFeed.js
 *
 * Mocks axios so no real HTTP requests are made.
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

const { fetchFeed } = await import("../src/fetchFeed.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRss({ title, link, items }) {
  const itemXml = items
    .map(
      (i) => `
    <item>
      <title><![CDATA[${i.title}]]></title>
      <link>${i.link}</link>
      <guid isPermaLink="true">${i.link}</guid>
      <pubDate>${i.pubDate}</pubDate>
    </item>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[${title}]]></title>
    <link>${link}</link>
    ${itemXml}
  </channel>
</rss>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("fetchFeed", () => {
  beforeEach(() => {
    mockAxiosGet.mock.resetCalls();
  });

  it("parses a standard RSS feed with multiple items", async () => {
    const xml = makeRss({
      title: "TLDR RSS Feed",
      link: "https://tldr.tech",
      items: [
        {
          title: "Day one headline",
          link: "https://tldr.tech/tech/2026-05-01",
          pubDate: "Thu, 01 May 2026 00:00:00 GMT",
        },
        {
          title: "Day two headline",
          link: "https://tldr.tech/tech/2026-04-30",
          pubDate: "Wed, 30 Apr 2026 00:00:00 GMT",
        },
      ],
    });

    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: xml }));

    const result = await fetchFeed("https://tldr.tech/api/rss/tech");

    assert.equal(result.feedTitle, "TLDR RSS Feed");
    assert.equal(result.feedLink, "https://tldr.tech");
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].title, "Day one headline");
    assert.equal(result.items[0].link, "https://tldr.tech/tech/2026-05-01");
    assert.equal(result.items[1].link, "https://tldr.tech/tech/2026-04-30");
  });

  it("handles a feed with a single item (not wrapped in an array by the parser)", async () => {
    const xml = makeRss({
      title: "Single Item Feed",
      link: "https://example.com",
      items: [
        {
          title: "Only item",
          link: "https://example.com/2026-05-01",
          pubDate: "Thu, 01 May 2026 00:00:00 GMT",
        },
      ],
    });

    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: xml }));

    const result = await fetchFeed("https://example.com/rss");

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "Only item");
  });

  it("filters out items that have no link", async () => {
    // Manually craft XML with one item missing a link
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    <link>https://example.com</link>
    <item>
      <title>Has a link</title>
      <link>https://example.com/page1</link>
      <pubDate>Thu, 01 May 2026 00:00:00 GMT</pubDate>
    </item>
    <item>
      <title>No link here</title>
      <pubDate>Wed, 30 Apr 2026 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: xml }));

    const result = await fetchFeed("https://example.com/rss");

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].title, "Has a link");
  });

  it("throws when the response is not a valid RSS channel", async () => {
    mockAxiosGet.mock.mockImplementationOnce(async () => ({
      data: "<html><body>Not RSS</body></html>",
    }));

    await assert.rejects(
      () => fetchFeed("https://example.com/rss"),
      /Could not parse RSS channel/
    );
  });

  it("passes the correct headers and timeout to axios", async () => {
    const xml = makeRss({
      title: "T",
      link: "https://t.com",
      items: [{ title: "A", link: "https://t.com/a", pubDate: "Thu, 01 May 2026 00:00:00 GMT" }],
    });

    mockAxiosGet.mock.mockImplementationOnce(async () => ({ data: xml }));

    await fetchFeed("https://t.com/rss");

    const [calledUrl, calledOpts] = mockAxiosGet.mock.calls[0].arguments;
    assert.equal(calledUrl, "https://t.com/rss");
    assert.ok(calledOpts.timeout > 0);
    assert.match(calledOpts.headers["User-Agent"], /rss-reformatter/);
    assert.equal(calledOpts.responseType, "text");
  });
});
