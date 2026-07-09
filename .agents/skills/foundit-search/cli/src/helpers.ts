// Data source: Foundit.in (formerly Monster India) "middleware" JSON endpoints —
// the same API the foundit.in search page calls client-side. No authentication
// required, but the endpoint content-negotiates: it returns 400 unless the
// request carries a browser-like Accept header and a foundit.in Referer.

export const SEARCH_URL = "https://www.foundit.in/middleware/jobsearch"
export const DETAIL_URL = "https://www.foundit.in/middleware/jobdetail"
export const SITE_URL = "https://www.foundit.in"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on a 404. */
export async function jsonFetch(url: string): Promise<unknown | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `${SITE_URL}/srp/results`,
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
    return response.json()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  experience: string | null
  salary: string | null
  date: string | null
  employmentType: string | null
  skills: string | null
  url: string
}

export interface JobDetail extends JobCard {
  description: string | null
  functions: string | null
  industries: string | null
  applyUrl: string | null
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

function expRange(job: Raw): string | null {
  const min = job.minimumExperience?.years
  const max = job.maximumExperience?.years
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min}-${max} yrs`
  return `${min ?? max}+ yrs`
}

function salaryRange(job: Raw): string | null {
  if (job.hideSalary) return null
  const min = job.minimumSalary?.absoluteValue
  const max = job.maximumSalary?.absoluteValue
  if (!min && !max) return null
  const cur = job.minimumSalary?.currency || job.currencyCode || "INR"
  const prefix = cur === "INR" ? "₹" : cur + " "
  // Express INR amounts in lakhs-per-annum, the convention Indian postings use.
  if (cur === "INR" && (max || min) >= 100000) {
    const lakh = (v: number) => (v / 100000).toFixed(1).replace(/\.0$/, "")
    const range = min && max && max !== min ? `${lakh(min)}-${lakh(max)}` : lakh(max || min)
    return `${prefix}${range} LPA`
  }
  const range = min && max && max !== min ? `${min}-${max}` : String(max || min)
  return `${prefix}${range}`
}

/**
 * locations is a plain string in search responses but an array of
 * { city, state, country, … } objects in detail responses.
 */
function locationText(locations: unknown): string | null {
  if (typeof locations === "string") return locations || null
  if (Array.isArray(locations)) {
    const names = locations
      .map((l: Raw) => l?.city || l?.state || l?.country)
      .filter((s: unknown): s is string => typeof s === "string" && s.length > 0)
    return names.length > 0 ? [...new Set(names)].join(", ") : null
  }
  return null
}

function jobUrl(job: Raw): string {
  const seo = job.seoJdUrl || job.jdUrl
  if (typeof seo === "string" && seo.length > 0) {
    return seo.startsWith("http") ? seo : `${SITE_URL}${seo.startsWith("/") ? "" : "/"}${seo}`
  }
  return `${SITE_URL}/job/${job.jobId ?? job.id}`
}

/**
 * createdAt is epoch millis in search responses but a relative string
 * ("15 hours ago") in detail responses — keep whichever is parseable.
 */
function toDate(createdAt: unknown): string | null {
  if (typeof createdAt === "number") return new Date(createdAt).toISOString().slice(0, 10)
  if (typeof createdAt === "string") {
    const t = new Date(createdAt)
    return isNaN(t.getTime()) ? createdAt : t.toISOString().slice(0, 10)
  }
  return null
}

function toCard(job: Raw): JobCard {
  return {
    id: String(job.jobId ?? job.id),
    title: job.title || "(untitled)",
    company: job.hideCompanyName ? null : job.companyName || null,
    location: locationText(job.locations),
    experience: expRange(job),
    salary: salaryRange(job),
    date: toDate(job.createdAt),
    employmentType: Array.isArray(job.employmentTypes) ? job.employmentTypes.join(", ") || null : null,
    skills: typeof job.skills === "string" ? job.skills || null : null,
    url: jobUrl(job),
  }
}

/** Parse /middleware/jobsearch response into cards (+ total count when present). */
export function parseSearchResponse(data: unknown): { cards: JobCard[]; total: number | null } {
  const resp = (data as Raw)?.jobSearchResponse
  const jobs: Raw[] = Array.isArray(resp?.data) ? resp.data : []
  const total = typeof resp?.totalCount === "number" ? resp.totalCount : null
  // The middleware pads responses with placeholder entries (ads/nulls) that
  // have no job ID or title — drop those.
  const cards = jobs
    .filter((j) => j && (j.jobId ?? j.id) != null && j.title)
    .map(toCard)
  return { cards, total }
}

/** Parse /middleware/jobdetail/{id} response. */
export function parseDetailResponse(data: unknown): JobDetail | null {
  const job = (data as Raw)?.jobDetailResponse as Raw | undefined
  if (!job || (!job.jobId && !job.id)) return null
  const card = toCard(job)
  return {
    ...card,
    description: typeof job.description === "string" ? htmlToText(job.description) || null : null,
    functions: Array.isArray(job.functions) ? job.functions.join(", ") || null : null,
    industries: Array.isArray(job.industries) ? job.industries.join(", ") || null : null,
    applyUrl: job.applyUrl || job.redirectUrl || null,
  }
}

/** Filter cards to those created within the last N days (keeps undated/unparseable dates). */
export function filterByAge(cards: JobCard[], days: number): JobCard[] {
  if (!days || days <= 0 || days >= 9999) return cards
  const cutoff = Date.now() - days * 86400_000
  return cards.filter((c) => {
    if (!c.date) return true
    const t = new Date(c.date).getTime()
    return isNaN(t) || t >= cutoff
  })
}
