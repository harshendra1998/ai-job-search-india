import { SITE_URL, htmlFetch, parseJobPage, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/**
 * Accept a full shine.com job URL or the slug from a search result's `url`
 * field (e.g. "python-developer/acme/19181937"). A bare numeric ID is NOT
 * enough — Shine job pages live under a slug, so pass the URL from `search`.
 */
function normalizeUrl(input: string): string | null {
  if (/^https?:\/\/(www\.)?shine\.com\/jobs\//.test(input)) return input.split("?")[0]
  if (/^\d+$/.test(input)) return null
  const slug = input.replace(/^\/+/, "").replace(/^jobs\//, "")
  if (/\d{4,}\/?$/.test(slug)) return `${SITE_URL}/jobs/${slug}`
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const url = normalizeUrl(opts.id)
  if (!url) {
    writeError(
      `Could not build a job URL from "${opts.id}". Pass the full shine.com job URL (or slug) from search results — a bare numeric ID is not enough.`,
      "BAD_ID",
    )
    return 1
  }
  try {
    const html = await htmlFetch(url)
    const job = html ? parseJobPage(html, url) : null
    if (!job) {
      writeError("Job not found (no JobPosting data on the page)", "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.experience ? `Experience: ${job.experience}` : "",
        job.salary ? `Salary: ${job.salary}` : "",
        job.employmentType ? `Employment: ${job.employmentType}` : "",
        job.datePosted ? `Posted: ${job.datePosted}` : "",
        job.validThrough ? `Apply by: ${job.validThrough}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
