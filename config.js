/**
 * Feed configuration.
 *
 * Each entry defines:
 *   - rssUrl:     the source RSS feed to fetch
 *   - outputDir:  directory (relative to OUTPUT_BASE) where feed files are written
 *   - title:      title used in the generated feeds
 *   - description: description used in the generated feeds
 *   - siteUrl:    canonical URL for the feed's website
 */

export const OUTPUT_BASE = "docs"; // GitHub Pages serves from /docs by default

export const FEEDS = [
  {
    rssUrl: "https://tldr.tech/api/rss/tech",
    outputDir: "tldr/tech",
    title: "TLDR Tech – Daily Digest",
    description: "Full daily digest from TLDR Tech, one item per day.",
    siteUrl: "https://tldr.tech/tech",
  },
  {
    rssUrl: "https://tldr.tech/api/rss/dev",
    outputDir: "tldr/dev",
    title: "TLDR Dev – Daily Digest",
    description: "Full daily digest from TLDR Dev, one item per day.",
    siteUrl: "https://tldr.tech/dev",
  },
  {
    rssUrl: "https://tldr.tech/api/rss/ai",
    outputDir: "tldr/ai",
    title: "TLDR AI – Daily Digest",
    description: "Full daily digest from TLDR AI, one item per day.",
    siteUrl: "https://tldr.tech/ai",
  },
  {
    rssUrl: "https://tldr.tech/api/rss/infosec",
    outputDir: "tldr/infosec",
    title: "TLDR Information Security – Daily Digest",
    description: "Full daily digest from TLDR Information Security, one item per day.",
    siteUrl: "https://tldr.tech/infosec",
  },
  {
    rssUrl: "https://tldr.tech/api/rss/devops",
    outputDir: "tldr/devops",
    title: "TLDR DevOps – Daily Digest",
    description: "Full daily digest from TLDR DevOps, one item per day.",
    siteUrl: "https://tldr.tech/devops",
  },
];

/** How many feed items (days) to include in the output feeds. */
export const MAX_ITEMS = 20;

/** Milliseconds to wait between HTTP requests to avoid hammering servers. */
export const REQUEST_DELAY_MS = 500;

/** Request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 15_000;
