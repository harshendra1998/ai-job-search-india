import { DETAIL_URL, jsonFetch, parseDetailResponse, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw job ID or any foundit.in job URL (numeric ID is the last path token). */
function normalizeId(input: string): string | null {
  const bare = input.match(/^\d{4,}$/)
  if (bare) return input
  if (/foundit\.(in|com)/.test(input) || input.startsWith("/")) {
    const m = input.match(/(\d{4,})(?:[/?#]|$)/g)
    if (m && m.length > 0) {
      const last = m[m.length - 1].match(/\d{4,}/)
      if (last) return last[0]
    }
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const data = await jsonFetch(`${DETAIL_URL}/${id}`)
    const job = data ? parseDetailResponse(data) : null
    if (!job) {
      writeError("Job not found", "NOT_FOUND")
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
        job.functions ? `Function: ${job.functions}` : "",
        job.industries ? `Industries: ${job.industries}` : "",
        job.skills ? `Skills: ${job.skills}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
        job.applyUrl ? `Apply: ${job.applyUrl}` : "",
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
