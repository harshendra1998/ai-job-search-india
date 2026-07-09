# Search Queries for Job Scraper

<!-- SETUP: Customize these queries based on your skills, target roles, and location -->

## Search Sites

Primary (Indian job market — CLI tools installed under `.agents/skills/`):
- **foundit.in** - Foundit (formerly Monster India) — use the `foundit-search` CLI
- **shine.com** - Shine — use the `shine-search` CLI
- **linkedin.com/jobs** - LinkedIn job listings — use the `linkedin-search` CLI with an explicit location (e.g. `-l "Bengaluru, Karnataka, India"` or `-l "Remote"`)

Secondary (WebSearch only — no CLI tool):
- **naukri.com** - India's largest job board; it hard-blocks automated access (recaptcha), so search it via Google `site:naukri.com` queries and open individual postings in the browser
- **instahyre.com** / **cutshort.io** / **hirist.tech** - curated tech hiring platforms (mostly login-walled; use `site:` searches for public postings)
- **iimjobs.com** - management/consulting roles
- Direct Google searches with `site:` filters for known target companies' career pages

## Query Categories

Queries are grouped by priority. Each query should be combined with your location terms (e.g. "Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Remote") where the site supports it.

### Priority 1: [YOUR_PRIMARY_ROLE_TYPE]

These match your strongest and most desired career direction.

```
foundit-search / shine-search / linkedin-search: "[YOUR_PRIMARY_JOB_TITLE]" in [YOUR_CITY]
site:naukri.com "[YOUR_PRIMARY_JOB_TITLE]" [YOUR_CITY]
site:naukri.com "[YOUR_KEY_SKILL]" [YOUR_CITY]
```

### Priority 2: [YOUR_DOMAIN_EXPERTISE]

These match your domain expertise.

```
foundit-search / shine-search: [YOUR_DOMAIN_KEYWORD_1] in [YOUR_CITY]
site:naukri.com [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY]
site:linkedin.com/jobs [YOUR_DOMAIN_KEYWORD_1] [YOUR_CITY] India
```

### Priority 3: [YOUR_ADJACENT_ROLE_TYPE]

Adjacent roles you could pivot into.

```
foundit-search / shine-search: "[YOUR_ADJACENT_TITLE_1]" [YOUR_KEY_SKILL] in [YOUR_CITY]
site:naukri.com "[YOUR_ADJACENT_TITLE_2]" [YOUR_KEY_SKILL] [YOUR_CITY]
```

### Priority 4: Broader Technical / Consulting

Wider net for general technical roles.

```
foundit-search / shine-search: [YOUR_KEY_SKILL] developer in [YOUR_CITY]
site:naukri.com [YOUR_KEY_SKILL] developer [YOUR_CITY]
site:linkedin.com/jobs "[YOUR_KEY_SKILL] developer" [YOUR_CITY]
```

## Location Filter

When evaluating results, verify the job location is within reasonable commute distance from your home (or explicitly remote/hybrid). Define acceptable areas:
- [YOUR_CITY] and surrounding areas
- [ACCEPTABLE_AREA_1] (e.g. specific tech parks / suburbs — "Whitefield", "Hinjewadi", "Gurugram", "Noida")
- [ACCEPTABLE_AREA_2]
- Remote / work-from-home roles
- [TOO_FAR_AREA] (too far — skip unless remote)

Note: many Indian postings list multiple cities in one ad ("Chennai, Pune & Bangalore") — treat these as a match if ANY listed city is acceptable, and flag which one applies.

## Experience & CTC Filter

- Skip postings whose experience band clearly excludes you (e.g. "8-12 yrs" when you have 3).
- When CTC is disclosed (usually in LPA), flag postings far below your target range rather than silently dropping them.
- Consultancy/staffing-firm bulk posts ("immediate joiners", walk-in drives) are common on Shine and Naukri — include them but mark them as staffing-firm posts so they rank below direct-company postings at equal fit.

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
