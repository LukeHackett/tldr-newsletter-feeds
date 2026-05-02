# TLDR Newsletter Feeds

Fetches [TLDR](https://tldr.tech) newsletter RSS feeds, enriches each daily digest with full article content scraped from the linked page, and outputs **RSS 2.0**, **Atom 1.0**, and **JSON Feed** files. 

Runs as a nightly GitHub Actions job and publishes to GitHub Pages.

## How it works

1. Fetches the source RSS feed (e.g. `https://tldr.tech/api/rss/tech`)
2. For each item, fetches the linked daily digest page (e.g. `https://tldr.tech/tech/2026-05-01`)
3. Extracts each article — title, URL, and summary — from the page
4. Writes enriched feed files with full content embedded, one item per day
5. Generates an `index.html` landing page listing all feeds

## Output structure

```
docs/
  index.html         ← landing page with links to all feeds
  tldr/
    tech/
      feed.rss
      feed.atom
      feed.json
    dev/
      feed.rss
      feed.atom
      feed.json
    ai/
      feed.rss
      feed.atom
      feed.json
    infosec/
      feed.rss
      feed.atom
      feed.json
    devops/
      feed.rss
      feed.atom
      feed.json
```

## Setup

### 1. Enable GitHub Pages

In your repo settings → Pages, set the source to **GitHub Actions**.

### 2. Set the Pages URL variable

In your repo settings → Secrets and variables → Actions → Variables, add:

| Name             | Value                                              |
|------------------|-----------------------------------------------------|
| `SITE_BASE_URL`  | `https://lukehackett.com/tldr-newsletter-feeds`    |

This is used to generate correct self-referencing feed links.

### 3. Run locally

```bash
npm install

# Build feeds (writes to docs/)
SITE_BASE_URL=https://lukehackett.com/tldr-newsletter-feeds npm run build

# Serve the docs/ directory at http://localhost:3000
npm run serve
```

## npm scripts

| Script        | Description                                              |
|---------------|----------------------------------------------------------|
| `npm run build` | Fetch all feeds and write output files to `docs/`      |
| `npm test`    | Run the test suite                                       |
| `npm run lint` | Run ESLint across `src/`                                |
| `npm run serve` | Serve the `docs/` directory at `http://localhost:3000` |
| `npm run clean` | Delete the `docs/` directory                           |

## CI / CD

### Pre-merge (`pre-merge.yml`)

Runs on every pull request to `main`. Executes lint, tests, and a full build to validate the pipeline end-to-end before merging.

### Deploy (`deploy.yml`)

Runs on:
- **Push to `main`** — deploys immediately on merge
- **Nightly cron at 08:00 UTC** — picks up new TLDR issues each day
- **Manual dispatch** — trigger a run from the Actions tab at any time

The deploy job has two stages: `build-feed` generates the files and uploads them as an artifact, then `deploy-to-github-pages` publishes to GitHub Pages. A `concurrency` lock ensures only one deployment runs at a time, cancelling any in-progress run in favour of the latest.

### Dependabot

Weekly PRs (every Monday) for both npm dependencies and GitHub Actions versions. These PRs run through the pre-merge checks automatically before merging.

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

| Setting              | Default | Description                                    |
|----------------------|---------|------------------------------------------------|
| `OUTPUT_BASE`        | `docs`  | Root output directory served by GitHub Pages   |
| `MAX_ITEMS`          | `20`    | Max feed items (days) to include per feed      |
| `REQUEST_DELAY_MS`   | `500`   | Polite delay between page fetches (ms)         |
| `REQUEST_TIMEOUT_MS` | `15000` | HTTP request timeout (ms)                      |

## License

[MIT](LICENSE)
