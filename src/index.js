/**
 * Main entry point.
 *
 * For each configured feed:
 *   1. Fetch the RSS feed to get the list of daily digest items
 *   2. For each item, fetch the linked page and extract article content
 *   3. Write enriched RSS 2.0 and Atom 1.0 files to disk
 */

import path from "path";
import { fileURLToPath } from "url";
import { FEEDS, OUTPUT_BASE, MAX_ITEMS, REQUEST_DELAY_MS } from "../config.js";
import { fetchFeed } from "./fetchFeed.js";
import { fetchPage } from "./fetchPage.js";
import { writeFeed } from "./writeFeed.js";
import { writeHtml } from "./writeHtml.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Simple delay helper */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processFeed(feedConfig) {
  const { rssUrl, outputDir, title, description, siteUrl } = feedConfig;

  console.log(`\n── Processing: ${title}`);
  console.log(`   Source: ${rssUrl}`);

  // 1. Fetch the RSS feed
  let feedData;
  try {
    feedData = await fetchFeed(rssUrl);
    console.log(`   Found ${feedData.items.length} items in feed`);
  } catch (err) {
    console.error(`   ✗ Failed to fetch RSS feed: ${err.message}`);
    return;
  }

  // 2. Limit to MAX_ITEMS and enrich each item with page content
  const itemsToProcess = feedData.items.slice(0, MAX_ITEMS);
  const enrichedItems = [];

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    console.log(`   [${i + 1}/${itemsToProcess.length}] Fetching: ${item.link}`);

    try {
      const { sections, rawHtml } = await fetchPage(item.link);
      const articleCount = sections.reduce((n, s) => n + s.articles.length, 0);
      console.log(`         → ${sections.length} sections, ${articleCount} articles`);

      // Build a plain-text summary from the first few article titles
      const firstArticles = sections
        .flatMap((s) => s.articles)
        .slice(0, 3)
        .map((a) => a.title);
      const summary =
        firstArticles.length > 0
          ? firstArticles.join(" · ") + (articleCount > 3 ? ` · +${articleCount - 3} more` : "")
          : item.title;

      enrichedItems.push({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || new Date().toUTCString(),
        contentHtml: rawHtml,
        summary,
      });
    } catch (err) {
      console.warn(`         ✗ Failed to fetch page (${err.message}), using stub`);
      enrichedItems.push({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate || new Date().toUTCString(),
        contentHtml: `<p>Could not fetch content. <a href="${item.link}">Read online</a>.</p>`,
        summary: item.title,
      });
    }

    // Polite delay between page fetches (skip after last item)
    if (i < itemsToProcess.length - 1) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  // 3. Write output files
  const absOutputDir = path.join(ROOT, OUTPUT_BASE, outputDir);

  // Derive the GitHub Pages base URL for feed self-links.
  // Falls back to a relative path if GITHUB_PAGES_URL env var is not set.
  const pagesBase = process.env.GITHUB_PAGES_URL
    ? `${process.env.GITHUB_PAGES_URL.replace(/\/$/, "")}/${outputDir}`
    : `/${outputDir}`;

  const { rssPath, atomPath, jsonPath } = writeFeed({
    title,
    description,
    siteUrl,
    outputDir: absOutputDir,
    feedBaseUrl: pagesBase,
    items: enrichedItems,
  });

  console.log(`   ✓ Written: ${path.relative(ROOT, rssPath)}`);
  console.log(`   ✓ Written: ${path.relative(ROOT, atomPath)}`);
  console.log(`   ✓ Written: ${path.relative(ROOT, jsonPath)}`);
}

async function main() {
  console.log("RSS Feed Reformatter");
  console.log(`Processing ${FEEDS.length} feed(s)…\n`);

  for (const feedConfig of FEEDS) {
    await processFeed(feedConfig);
  }

  // Write the HTML index page listing all feeds
  const docsDir = path.join(ROOT, OUTPUT_BASE);
  const pagesBase = process.env.GITHUB_PAGES_URL
    ? process.env.GITHUB_PAGES_URL.replace(/\/$/, "")
    : "";

  const { htmlPath } = writeHtml({
    outputDir: docsDir,
    feedBaseUrl: pagesBase,
    feeds: FEEDS,
    builtAt: new Date(),
  });
  console.log(`\n✓ Written: ${path.relative(ROOT, htmlPath)}`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
