import {
  SEARCH_URL,
  jsonFetch,
  parseSearchResponse,
  filterByAge,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  experience?: number
  jobage: number
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("query", `"${opts.query}"`)
  if (opts.location) params.set("locations", opts.location)
  if (opts.experience !== undefined) params.set("experience", String(opts.experience))
  params.set("start", String((opts.page - 1) * opts.limit))
  params.set("limit", String(opts.limit))
  params.set("sort", "1") // 1 = most recent first
  return `${SEARCH_URL}?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 40).padEnd(40)
    const company = (c.company || "—").slice(0, 24).padEnd(24)
    const loc = (c.location || "—").slice(0, 22).padEnd(22)
    const exp = (c.experience || "—").padEnd(9)
    const date = c.date || "—"
    return `${c.id.padEnd(10)} ${title} ${company} ${loc} ${exp} ${date}`
  })
  const header =
    "ID".padEnd(10) +
    " " +
    "TITLE".padEnd(40) +
    " " +
    "COMPANY".padEnd(24) +
    " " +
    "LOCATION".padEnd(22) +
    " " +
    "EXP".padEnd(9) +
    " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const data = await jsonFetch(buildUrl(opts))
    const { cards: all, total } = parseSearchResponse(data)
    const cards = filterByAge(all, opts.jobage).slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.experience || "—"} · ${c.date || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, total, page: opts.page }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
