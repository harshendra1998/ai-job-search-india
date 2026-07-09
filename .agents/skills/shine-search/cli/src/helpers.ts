// Data source: Shine.com's public search API (the same JSON endpoint the site's
// search page calls) plus schema.org JSON-LD embedded in job-detail pages.
// No authentication required.

export const SEARCH_URL = "https://www.shine.com/api/v2/search/simple/"
export const SITE_URL = "https://www.shine.com"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

/** Fetch with exponential backoff on 429/5xx. Returns null on a 404. */
async function backoffFetch(url: string, accept: string): Promise<Response | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response
  }
  throw new Error("Request failed after max retries")
}

export async function jsonFetch(url: string): Promise<unknown | null> {
  const r = await backoffFetch(url, "application/json")
  return r ? r.json() : null
}

export async function htmlFetch(url: string): Promise<string> {
  const r = await backoffFetch(
    url,
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  )
  return r ? r.text() : ""
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  experience: string | null
  salary: string | null
  date: string | null
  keywords: string | null
  url: string
}

export interface JobDetail {
  id: string
  title: string
  company: string | null
  location: string | null
  experience: string | null
  salary: string | null
  datePosted: string | null
  validThrough: string | null
  employmentType: string | null
  description: string | null
  url: string
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = parseInt(dec, 10)
      return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
    })
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => {
      const cp = parseInt(hex, 16)
      return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
    })
    .replace(/&nbsp;/g, " ")
}

/** Convert a job-description HTML fragment to readable plain text. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d|tr)>/gi, "\n")
    .replace(/<(td|th)[^>]*>/gi, " ")
    .replace(/<li[^>]*>/gi, "• ")
  // Drop remaining (inline) tags without inserting a space, so "<b>APIs</b>."
  // does not become "APIs ."
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>

function toCard(job: Raw): JobCard {
  const slug = typeof job.jSlug === "string" && job.jSlug ? job.jSlug : null
  return {
    id: String(job.id ?? ""),
    title: job.jJT || "(untitled)",
    company: job.jCName || null,
    location: Array.isArray(job.jLoc) ? job.jLoc.join(", ") || null : job.jLoc || null,
    experience: job.jExp || null,
    salary: job.jSal || null,
    date: typeof job.jPDate === "string" ? job.jPDate.slice(0, 10) : null,
    keywords: job.jKwd || null,
    url: slug ? `${SITE_URL}/jobs/${slug}` : `${SITE_URL}/jobs/${job.id ?? ""}`,
  }
}

/** Parse the /api/v2/search/simple/ response into cards (+ total count). */
export function parseSearchResponse(data: unknown): { cards: JobCard[]; total: number | null } {
  const d = data as Raw
  const results: Raw[] = Array.isArray(d?.results) ? d.results : []
  const total = typeof d?.count === "number" ? d.count : null
  return { cards: results.filter((j) => j && j.id != null).map(toCard), total }
}

/** Filter cards to those posted within the last N days (keeps undated cards). */
export function filterByAge(cards: JobCard[], days: number): JobCard[] {
  if (!days || days <= 0 || days >= 9999) return cards
  const cutoff = Date.now() - days * 86400_000
  return cards.filter((c) => !c.date || new Date(c.date).getTime() >= cutoff)
}

/** Pull every <script type="application/ld+json"> payload out of a page. */
function ldJsonBlocks(html: string): Raw[] {
  const blocks: Raw[] = []
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1])
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        if (item && typeof item === "object") blocks.push(item)
        if (Array.isArray(item?.["@graph"])) blocks.push(...item["@graph"])
      }
    } catch {
      // skip malformed blocks — pages often carry several, and one bad block
      // must not sink the JobPosting we're after
    }
  }
  return blocks
}

function placeToText(loc: unknown): string | null {
  const places = Array.isArray(loc) ? loc : loc ? [loc] : []
  const names = places
    .map((p: Raw) => p?.address?.addressLocality || p?.address?.addressRegion || p?.name)
    .filter((s: unknown): s is string => typeof s === "string" && s.length > 0)
  return names.length > 0 ? names.join(", ") : null
}

function salaryToText(base: Raw | undefined): string | null {
  const v = base?.value
  if (!v) return null
  const cur = base?.currency || ""
  const range =
    v.minValue != null && v.maxValue != null
      ? `${v.minValue}-${v.maxValue}`
      : v.value != null
        ? String(v.value)
        : null
  if (!range) return null
  return `${cur ? cur + " " : ""}${range}${v.unitText ? ` per ${String(v.unitText).toLowerCase()}` : ""}`
}

/** Parse a Shine job page's JSON-LD JobPosting into a JobDetail. */
export function parseJobPage(html: string, url: string): JobDetail | null {
  const posting = ldJsonBlocks(html).find((b) => b["@type"] === "JobPosting")
  if (!posting) return null
  const months = posting.experienceRequirements?.monthsOfExperience
  return {
    id: String(posting.identifier?.value ?? url.match(/(\d{4,})\/?$/)?.[1] ?? ""),
    title: posting.title || "(untitled)",
    company: posting.hiringOrganization?.name || null,
    location: placeToText(posting.jobLocation),
    experience: typeof months === "number" ? `${Math.round(months / 12)}+ yrs` : null,
    salary: salaryToText(posting.baseSalary),
    datePosted: typeof posting.datePosted === "string" ? posting.datePosted.slice(0, 10) : null,
    validThrough: typeof posting.validThrough === "string" ? posting.validThrough.slice(0, 10) : null,
    employmentType: Array.isArray(posting.employmentType)
      ? posting.employmentType.join(", ")
      : posting.employmentType || null,
    description: typeof posting.description === "string" ? htmlToText(posting.description) || null : null,
    url: posting.url || url,
  }
}
