/**
 * Tests for src/writeHtml.js
 *
 * Mocks fs so no files are written to disk.
 */

import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const mockMkdirSync = mock.fn();
const mockWriteFileSync = mock.fn();

mock.module("fs", {
  exports: {
    mkdirSync: mockMkdirSync,
    writeFileSync: mockWriteFileSync,
  },
});

const { writeHtml } = await import("../src/writeHtml.js");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_OPTS = {
  outputDir: "/tmp/test-output/docs",
  feedBaseUrl: "https://example.github.io/feeds",
  feeds: [
    {
      title: "TLDR Tech – Daily Digest",
      description: "Full daily digest from TLDR Tech.",
      outputDir: "tldr/tech",
    },
    {
      title: "TLDR AI – Daily Digest",
      description: "Full daily digest from TLDR AI.",
      outputDir: "tldr/ai",
    },
  ],
  builtAt: new Date("2026-05-01T08:00:00Z"),
};

function getCapturedHtml() {
  const call = mockWriteFileSync.mock.calls.find(({ arguments: [p] }) =>
    p.endsWith("index.html")
  );
  assert.ok(call, "Expected a writeFileSync call for index.html");
  return call.arguments[1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("writeHtml", () => {
  beforeEach(() => {
    mockMkdirSync.mock.resetCalls();
    mockWriteFileSync.mock.resetCalls();
  });

  it("creates the output directory", () => {
    writeHtml(BASE_OPTS);
    assert.equal(mockMkdirSync.mock.calls.length, 1);
    const [dir, opts] = mockMkdirSync.mock.calls[0].arguments;
    assert.equal(dir, BASE_OPTS.outputDir);
    assert.deepEqual(opts, { recursive: true });
  });

  it("writes an index.html file", () => {
    writeHtml(BASE_OPTS);
    const paths = mockWriteFileSync.mock.calls.map((c) => c.arguments[0]);
    assert.ok(paths.some((p) => p.endsWith("index.html")));
  });

  it("returns the htmlPath", () => {
    const result = writeHtml(BASE_OPTS);
    assert.ok(result.htmlPath.endsWith("index.html"));
  });

  it("includes a section for each feed", () => {
    writeHtml(BASE_OPTS);
    const html = getCapturedHtml();
    assert.match(html, /TLDR Tech.*Daily Digest/);
    assert.match(html, /TLDR AI.*Daily Digest/);
  });

  it("includes RSS, Atom and JSON Feed links for each feed", () => {
    writeHtml(BASE_OPTS);
    const html = getCapturedHtml();
    // Tech feed links
    assert.match(html, /feeds\/tldr\/tech\/feed\.rss/);
    assert.match(html, /feeds\/tldr\/tech\/feed\.atom/);
    assert.match(html, /feeds\/tldr\/tech\/feed\.json/);
    // AI feed links
    assert.match(html, /feeds\/tldr\/ai\/feed\.rss/);
    assert.match(html, /feeds\/tldr\/ai\/feed\.atom/);
    assert.match(html, /feeds\/tldr\/ai\/feed\.json/);
  });

  it("includes the build timestamp in the footer", () => {
    writeHtml(BASE_OPTS);
    const html = getCapturedHtml();
    assert.match(html, /Fri, 01 May 2026/);
  });

  it("escapes HTML special characters in feed titles", () => {
    writeHtml({
      ...BASE_OPTS,
      feeds: [
        {
          title: "Feed <script>alert('xss')</script>",
          description: "A & B",
          outputDir: "test/feed",
        },
      ],
    });
    const html = getCapturedHtml();
    assert.ok(!html.includes("<script>"));
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /A &amp; B/);
  });

  it("is valid HTML with a doctype and lang attribute", () => {
    writeHtml(BASE_OPTS);
    const html = getCapturedHtml();
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<html lang="en">/);
  });
});
