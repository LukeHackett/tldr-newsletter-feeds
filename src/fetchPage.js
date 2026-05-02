/**
 * Fetches a TLDR daily digest page and extracts structured content.
 *
 * Page structure (Next.js SSR):
 *   <section>
 *     <header>
 *       <h3 class="text-center font-bold">Section Name</h3>
 *     </header>
 *     <article class="mt-3">
 *       <a class="font-bold" href="https://...">
 *         <h3>Article Title (N minute read)</h3>
 *       </a>
 *       <div class="newsletter-html">Summary text, may contain links.</div>
 *     </article>
 *     ...
 *   </section>
 *
 * Returns:
 * {
 *   sections: [
 *     {
 *       heading: string,
 *       articles: [{ title, url, contentHtml }]
 *     }
 *   ],
 *   rawHtml: string  // full formatted HTML for embedding in the feed item
 * }
 */

import axios from "axios";
import * as cheerio from "cheerio";
import { REQUEST_TIMEOUT_MS } from "../config.js";

/**
 * @param {string} url
 * @returns {Promise<{ sections: Array, rawHtml: string }>}
 */
export async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      "User-Agent": "rss-reformatter/1.0 (github-action)",
      Accept: "text/html",
    },
    responseType: "text",
  });

  const $ = cheerio.load(response.data);
  const sections = [];

  $("section").each((_, sectionEl) => {
    const section = $(sectionEl);

    // Section heading comes from header > h3
    const heading = section.find("header h3").text().trim();

    const articles = [];

    section.find("article").each((_, articleEl) => {
      const article = $(articleEl);

      // Title and URL from the anchor wrapping the h3
      const anchor = article.find("a.font-bold").first();
      const url = anchor.attr("href") || "";
      const title = anchor.find("h3").text().trim();

      // Content HTML from div.newsletter-html — keep inner HTML intact so
      // any links inside the summary are preserved for the reader
      const contentHtml = article.find("div.newsletter-html").html() || "";

      if (title && url) {
        articles.push({ title, url, contentHtml });
      }
    });

    // Only include sections that have at least one article
    if (articles.length > 0) {
      sections.push({ heading: heading || "Articles", articles });
    }
  });

  const rawHtml = buildContentHtml(sections, url);

  return { sections, rawHtml };
}

/**
 * Builds clean HTML from the extracted sections for embedding in the feed.
 *
 * Each article becomes:
 *   <h3><a href="...">Title</a></h3>
 *   <p>...newsletter-html content...</p>
 *
 * @param {Array} sections
 * @param {string} sourceUrl
 * @returns {string}
 */
function buildContentHtml(sections, sourceUrl) {
  if (sections.length === 0) {
    return `<p>No articles extracted. <a href="${escapeHtml(sourceUrl)}">View the full digest online</a>.</p>`;
  }

  const parts = [];

  for (const section of sections) {
    parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);

    for (const article of section.articles) {
      // Title links directly to the article
      parts.push(
        `<h3><a href="${escapeHtml(article.url)}">${escapeHtml(article.title)}</a></h3>`
      );
      // Content HTML is already sanitised HTML from the page — wrap in a div
      if (article.contentHtml) {
        parts.push(`<div>${article.contentHtml}</div>`);
      }
    }
  }

  parts.push(`<hr><p><a href="${escapeHtml(sourceUrl)}">View full digest online</a></p>`);

  return parts.join("\n");
}

/**
 * Escapes HTML special characters for use in attributes and text nodes.
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
