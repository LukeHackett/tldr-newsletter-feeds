/**
 * Fetches and parses an RSS feed URL.
 * Returns an array of feed items: { title, link, pubDate, guid }
 */

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { REQUEST_TIMEOUT_MS } from "../config.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
});

/**
 * @param {string} url
 * @returns {Promise<{ feedTitle: string, feedLink: string, items: Array<{title:string, link:string, pubDate:string, guid:string}> }>}
 */
export async function fetchFeed(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: { "User-Agent": "rss-reformatter/1.0 (github-action)" },
    responseType: "text",
  });

  const parsed = parser.parse(response.data);
  const channel = parsed?.rss?.channel;

  if (!channel) {
    throw new Error(`Could not parse RSS channel from ${url}`);
  }

  const rawItems = Array.isArray(channel.item) ? channel.item : [channel.item];

  const items = rawItems
    .filter(Boolean)
    .map((item) => ({
      title: extractText(item.title),
      link: extractText(item.link),
      pubDate: extractText(item.pubDate),
      guid: extractText(item.guid),
    }))
    .filter((item) => item.link); // must have a link to fetch content

  return {
    feedTitle: extractText(channel.title),
    feedLink: extractText(channel.link),
    items,
  };
}

/**
 * fast-xml-parser may wrap CDATA values in an object; unwrap them.
 * @param {any} value
 * @returns {string}
 */
function extractText(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    // CDATA wrapped
    if (value.__cdata) return String(value.__cdata).trim();
    // attribute-bearing element (e.g. <guid isPermaLink="true">url</guid>)
    if (value["#text"]) return String(value["#text"]).trim();
  }
  return String(value).trim();
}
