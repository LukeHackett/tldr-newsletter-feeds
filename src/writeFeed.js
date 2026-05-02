/**
 * Takes enriched feed items and writes RSS 2.0, Atom 1.0, and JSON Feed 1.1
 * files to disk using the `feed` package.
 */

import fs from "fs";
import path from "path";
import { Feed } from "feed";

/**
 * @param {object} opts
 * @param {string} opts.title          - Feed title
 * @param {string} opts.description    - Feed description
 * @param {string} opts.siteUrl        - Canonical site URL
 * @param {string} opts.outputDir      - Absolute path to output directory
 * @param {string} opts.feedBaseUrl    - Base URL where the feed files will be hosted (GitHub Pages)
 * @param {Array}  opts.items          - Enriched items: { title, link, pubDate, contentHtml }
 */
export function writeFeed({
  title,
  description,
  siteUrl,
  outputDir,
  feedBaseUrl,
  items,
}) {
  const feed = new Feed({
    title,
    description,
    id: siteUrl,
    link: siteUrl,
    language: "en",
    favicon: "https://tldr.tech/tldrsquare.png",
    copyright: `© ${new Date().getFullYear()} TLDR`,
    updated: items.length > 0 ? new Date(items[0].pubDate) : new Date(),
    feedLinks: {
      rss: `${feedBaseUrl}/feed.rss`,
      atom: `${feedBaseUrl}/feed.atom`,
      json: `${feedBaseUrl}/feed.json`,
    },
  });

  for (const item of items) {
    feed.addItem({
      title: item.title,
      id: item.link,
      link: item.link,
      date: new Date(item.pubDate),
      content: item.contentHtml,  // full HTML — goes into <content:encoded> / <content> / content_html
      description: item.summary,  // plain-text excerpt — goes into <description> / <summary> / summary
    });
  }

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const rssPath = path.join(outputDir, "feed.rss");
  const atomPath = path.join(outputDir, "feed.atom");
  const jsonPath = path.join(outputDir, "feed.json");

  fs.writeFileSync(rssPath, feed.rss2(), "utf8");
  fs.writeFileSync(atomPath, feed.atom1(), "utf8");
  fs.writeFileSync(jsonPath, feed.json1(), "utf8");

  return { rssPath, atomPath, jsonPath };
}
