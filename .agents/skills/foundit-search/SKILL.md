---
name: foundit-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for jobs in India on
  Foundit (formerly Monster India) — find job listings, open positions,
  vacancies, or hiring across any sector or role (software, data, design,
  marketing, finance, legal, operations, etc.) in Indian cities or remotely.
  Trigger phrases: find a job, job search, search for jobs, job openings,
  vacancies, hiring, naukri, foundit, monster india, "are there any X jobs
  in <Indian city>", look up this foundit job posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/foundit-search/cli/src/cli.ts *)
---

# Foundit Search Skill

Search live job listings from **Foundit.in** (formerly Monster India), one of India's
largest job portals. No authentication, no API key, and **zero runtime dependencies** —
it runs with just `bun`. Results include experience range, salary (when disclosed, in
LPA), skills, and posting date.

## ⚠️ Personal use only

This uses the same public JSON endpoints the foundit.in site calls client-side.
**Keep volume low and don't use it commercially or for bulk data collection.**
Run it on your own responsibility.

## When to use this skill

- Search for job openings in any Indian city (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune, Chennai, …) or remote
- Filter by years of experience or recency (posted within N days)
- Get the full description of a specific Foundit job listing

## Commands

### Search job listings

```bash
bun run .agents/skills/foundit-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Recommended.
- `--location <text>` / `-l <text>` — city, e.g. `"Bengaluru"`, `"Mumbai"`, `"Delhi NCR"`, `"Hyderabad"`, `"Pune"`, `"Chennai"`, `"Remote"`.
- `--experience <yrs>` / `-e <yrs>` — years of experience (single number).
- `--jobage <days>` — posted within N days (client-side filter on posting date).
- `--page <n>` — page number (1-indexed).
- `--limit <n>` / `-n <n>` — results per page (server-side, default 15).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/foundit-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric job ID from `search` results (e.g. `58325394`). You may also pass
a full foundit.in job URL. Returns the full description, experience range, salary,
skills, functions, industries, and apply link.

## Usage examples

```bash
# Data engineer roles in Bengaluru, last 14 days
bun run .agents/skills/foundit-search/cli/src/cli.ts search -q "data engineer" -l "Bengaluru" --jobage 14 --format table

# Product manager roles in Mumbai for ~5 years experience
bun run .agents/skills/foundit-search/cli/src/cli.ts search -q "product manager" -l "Mumbai" -e 5 --format table

# Full details for a specific job
bun run .agents/skills/foundit-search/cli/src/cli.ts detail 58325394 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Salary shows as `₹X-Y LPA` when the recruiter discloses it; most postings hide it.
- `--jobage` filters client-side on the posting's `createdAt` date; combine with `sort=recent` (default) so early pages are the newest jobs.
- The endpoint requires browser-like headers (handled by the CLI); if Foundit changes its middleware API, update `src/helpers.ts`.
- Job IDs are numeric (e.g. `58325394`) — pass them as-is to `detail`.
