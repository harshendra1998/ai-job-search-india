# Contributing

This is an **India-focused fork** of [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search).

## What belongs where

- **India-specific contributions belong here**: new Indian portal skills (Hirist, Cutshort, TimesJobs, IIMJobs, …), fixes to the `foundit-search`/`shine-search` CLIs when the portals change their APIs, better India search-query strategies, INR/CTC salary tooling improvements, and Indian CV/ATS conventions.
- **Country-agnostic improvements belong upstream**: fixes to the core workflow (`/setup`, `/apply`, `/interview`, …), the `linkedin-search` tool, LaTeX templates, or the `/add-portal` generator should be proposed to the [upstream repo](https://github.com/MadsLorentzen/ai-job-search) so every market benefits — read its `CONTRIBUTING.md` first, as it has a deliberate, narrow merge policy. (Country-specific portal skills are explicitly *declined* upstream, which is why this fork exists.)
- **Personal profile data belongs in your own fork of this fork.** The template ships placeholders; never commit a populated profile.

## Practical notes

- **Portal-skill contract**: `search`/`detail` commands, `--format json|table|plain`, stderr JSON errors with exit 1, backoff on 429/5xx, zero runtime dependencies by default. See `/add-portal`'s spec; `foundit-search` (JSON API) and `shine-search` (JSON API + JSON-LD page parsing) are the in-tree reference implementations.
- **Personal-use boundaries**: portal skills that touch ToS-restricted sources carry a prominent personal-use-only warning, and CI deliberately makes no live portal requests. Don't "fix" that. Naukri.com actively blocks automated access — don't submit a Naukri scraper that bypasses recaptcha.
- **Before submitting**: run `python tools/lint_skills.py`, `bun run typecheck` and `bun test` in any touched CLI, and state the failing case your change fixes with reproduction steps.
- **LaTeX changes**: both templates must compile (`lualatex` for the CV, `xelatex` for the cover letter) and hold their exact page counts. CI smoke-checks this.
