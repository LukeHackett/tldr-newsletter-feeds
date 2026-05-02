# RSS Feed Reformatter

Fetches TLDR newsletter RSS feeds, enriches each daily digest item with full article content scraped from the linked page, and outputs both **RSS 2.0** and **Atom 1.0** files. 

Runs as a nightly GitHub Actions job and publishes to GitHub Pages.

## Output structure

```
docs/
  tldr/
    tech/
      feed.rss
      feed.atom
    ai/
      feed.rss
      feed.atom
    devops/
      feed.rss
      feed.atom
```

## Setup

### 1. Enable GitHub Pages

In your repo settings → Pages, set the source to **Deploy from a branch**, branch `main`, folder `/docs`.

### 2. Set the Pages URL variable

In your repo settings → Secrets and variables → Actions → Variables, add:

| Name                | Value                                      |
|---------------------|--------------------------------------------|
| `GITHUB_PAGES_URL`  | `https://yourname.github.io/your-repo`     |

This is used to generate correct self-referencing feed links.

### 3. Run locally

```bash
npm install
GITHUB_PAGES_URL=https://yourname.github.io/your-repo node src/index.js
```

## Adding more feeds

Edit `config.js` and add an entry to the `FEEDS` array:

```js
{
  rssUrl: "https://tldr.tech/api/rss/webdev",
  outputDir: "tldr/webdev",
  title: "TLDR Web Dev – Daily Digest",
  description: "Full daily digest from TLDR Web Dev.",
  siteUrl: "https://tldr.tech/webdev",
}
```

## Configuration

All tunable settings are in `config.js`:

| Setting             | Default | Description                                      |
|---------------------|---------|--------------------------------------------------|
| `OUTPUT_BASE`       | `docs`  | Root output directory (served by GitHub Pages)   |
| `MAX_ITEMS`         | `20`    | Max feed items (days) to include per feed        |
| `REQUEST_DELAY_MS`  | `500`   | Delay between page fetches (ms)                  |
| `REQUEST_TIMEOUT_MS`| `15000` | HTTP request timeout (ms)                        |
