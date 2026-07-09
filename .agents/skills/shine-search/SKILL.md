---
name: shine-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for jobs in India on
  Shine.com — find job listings, open positions, vacancies, or hiring across
  any sector or role (software, data, design, marketing, finance, legal,
  operations, etc.) in Indian cities. Trigger phrases: find a job, job search,
  search for jobs, job openings, vacancies, hiring, shine, "are there any X
  jobs in <Indian city>", look up this shine job posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/shine-search/cli/src/cli.ts *)
---

# Shine Search Skill

Search live job listings from **Shine.com**, one of India's largest job portals
(run by HT Media). No authentication, no API key, and **zero runtime dependencies** —
it runs with just `bun`. Search results include experience range, posting date, and
matched keywords; the `detail` command returns the full description parsed from the
job page's schema.org JSON-LD.

## ⚠️ Personal use only

This uses Shine's public search API and public job pages. **Keep volume low and
don't use it commercially or for bulk data collection.** Run it on your own
responsibility.

## When to use this skill

- Search for job openings in any Indian city (Bengaluru, Mumbai, Delhi, Hyderabad, Pune, Chennai, …)
- Filter by recency (posted within N days)
- Get the full description of a specific Shine job listing

## Commands

### Search job listings

```bash
bun run .agents/skills/shine-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Recommended.
- `--location <text>` / `-l <text>` — city, e.g. `"Bengaluru"`, `"Mumbai"`, `"Delhi"`, `"Hyderabad"`, `"Pune"`, `"Chennai"`.
- `--jobage <days>` — posted within N days (client-side filter on posting date).
- `--page <n>` — page number (1-indexed).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/shine-search/cli/src/cli.ts detail <url|slug> [--format json|plain]
```

Pass the **full shine.com job URL** (or its slug) from a search result's `url` field.
Shine job pages live under a slug, so a bare numeric ID is not enough. Returns the
full description, employment type, posting date, and application deadline.

## Usage examples

```bash
# Data engineer roles in Bengaluru, last 14 days
bun run .agents/skills/shine-search/cli/src/cli.ts search -q "data engineer" -l "Bengaluru" --jobage 14 --format table

# Python developer roles in Pune
bun run .agents/skills/shine-search/cli/src/cli.ts search -q "python developer" -l "Pune" --format table

# Full details for a job from search results
bun run .agents/skills/shine-search/cli/src/cli.ts detail "https://www.shine.com/jobs/python-developer-with-reactjs/white-horse-manpower/19181937" --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing URLs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Many Shine postings are placed by staffing/consultancy firms — check the company name and treat "immediate joiner" bulk posts with appropriate skepticism.
- Salary is usually undisclosed; when present it appears in the `salary` field.
- `--jobage` filters client-side on the posting date returned by the API.
- The `detail` command parses schema.org JSON-LD from the job page; if Shine changes its page structure, update `parseJobPage` in `src/helpers.ts`.
