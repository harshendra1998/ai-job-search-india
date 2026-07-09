import { describe, test, expect } from "bun:test"
import { parseSearchResponse, parseJobPage, filterByAge, htmlToText } from "../src/helpers"

function rawJob(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "19181937",
    jJT: "Python Developer with ReactJS",
    jCName: "Acme Consultancy",
    jLoc: ["Bangalore", "Chennai"],
    jPDate: "2026-06-30T18:30:05",
    jExp: "2 to 7 Yrs",
    jSal: null,
    jKwd: "python, reactjs",
    jSlug: "python-developer-with-reactjs/acme-consultancy/19181937",
    ...overrides,
  }
}

describe("parseSearchResponse", () => {
  test("maps API fields onto job cards", () => {
    const { cards, total } = parseSearchResponse({ count: 1304, results: [rawJob()] })
    expect(total).toBe(1304)
    expect(cards).toHaveLength(1)
    const c = cards[0]
    expect(c.id).toBe("19181937")
    expect(c.title).toBe("Python Developer with ReactJS")
    expect(c.company).toBe("Acme Consultancy")
    expect(c.location).toBe("Bangalore, Chennai")
    expect(c.experience).toBe("2 to 7 Yrs")
    expect(c.date).toBe("2026-06-30")
    expect(c.url).toBe(
      "https://www.shine.com/jobs/python-developer-with-reactjs/acme-consultancy/19181937",
    )
  })

  test("tolerates a malformed response", () => {
    expect(parseSearchResponse(null).cards).toEqual([])
    expect(parseSearchResponse({}).cards).toEqual([])
    expect(parseSearchResponse({ results: [null, {}] }).cards).toHaveLength(0)
  })
})

describe("parseJobPage", () => {
  const posting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "Python Developer",
    hiringOrganization: { "@type": "Organization", name: "Acme" },
    identifier: { "@type": "PropertyValue", value: "19181937" },
    url: "https://www.shine.com/jobs/python-developer/acme/19181937",
    datePosted: "2026-06-30T18:30:05+05:30",
    validThrough: "2026-08-30T00:00:00+05:30",
    employmentType: ["FULL_TIME"],
    experienceRequirements: { "@type": "OccupationalExperienceRequirements", monthsOfExperience: 24 },
    jobLocation: [
      { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Bangalore" } },
      { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: "Pune" } },
    ],
    description: "<p>Build <b>APIs</b> in Python.</p>",
  }

  function page(blocks: unknown[]): string {
    return blocks
      .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
      .join("\n")
  }

  test("extracts the JobPosting from among multiple JSON-LD blocks", () => {
    const html = page([{ "@type": "BreadcrumbList" }, posting, { "@type": "ItemList" }])
    const job = parseJobPage(html, posting.url)
    expect(job).not.toBeNull()
    expect(job!.id).toBe("19181937")
    expect(job!.title).toBe("Python Developer")
    expect(job!.company).toBe("Acme")
    expect(job!.location).toBe("Bangalore, Pune")
    expect(job!.experience).toBe("2+ yrs")
    expect(job!.datePosted).toBe("2026-06-30")
    expect(job!.validThrough).toBe("2026-08-30")
    expect(job!.employmentType).toBe("FULL_TIME")
    expect(job!.description).toContain("Build APIs in Python.")
  })

  test("survives a malformed JSON-LD block before the JobPosting", () => {
    const html =
      `<script type="application/ld+json">{not json}</script>` + page([posting])
    expect(parseJobPage(html, posting.url)).not.toBeNull()
  })

  test("returns null when no JobPosting block exists", () => {
    expect(parseJobPage(page([{ "@type": "BreadcrumbList" }]), "u")).toBeNull()
    expect(parseJobPage("<html></html>", "u")).toBeNull()
  })
})

describe("filterByAge", () => {
  const card = (date: string | null) => ({
    id: "1",
    title: "t",
    company: null,
    location: null,
    experience: null,
    salary: null,
    date,
    keywords: null,
    url: "u",
  })

  test("drops cards older than the cutoff, keeps undated ones", () => {
    const old = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
    const fresh = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10)
    const out = filterByAge([card(old), card(fresh), card(null)], 14)
    expect(out.map((c) => c.date)).toEqual([fresh, null])
  })
})

describe("htmlToText", () => {
  test("decodes entities and preserves list structure", () => {
    const text = htmlToText("<p>CTC: 6 LPA &amp; benefits</p><ul><li>Python</li></ul>")
    expect(text).toContain("CTC: 6 LPA & benefits")
    expect(text).toContain("• Python")
  })
})
