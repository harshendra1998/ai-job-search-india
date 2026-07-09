import { describe, test, expect } from "bun:test"
import {
  parseSearchResponse,
  parseDetailResponse,
  filterByAge,
  htmlToText,
} from "../src/helpers"

function rawJob(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    jobId: 58325394,
    id: "58325394",
    title: "Senior Python Developer",
    companyName: "Acme Tech",
    locations: "Bengaluru, India",
    minimumExperience: { years: 5 },
    maximumExperience: { years: 7 },
    minimumSalary: { currency: "INR", absoluteValue: 1200000 },
    maximumSalary: { currency: "INR", absoluteValue: 1800000 },
    createdAt: Date.UTC(2026, 6, 1),
    employmentTypes: ["Full time"],
    skills: "Python, AWS",
    seoJdUrl: "/job/senior-python-developer-acme-58325394",
    hideSalary: false,
    hideCompanyName: false,
    ...overrides,
  }
}

describe("parseSearchResponse", () => {
  test("maps middleware fields onto job cards", () => {
    const { cards } = parseSearchResponse({
      jobSearchResponse: { data: [rawJob()], totalCount: 42 },
    })
    expect(cards).toHaveLength(1)
    const c = cards[0]
    expect(c.id).toBe("58325394")
    expect(c.title).toBe("Senior Python Developer")
    expect(c.company).toBe("Acme Tech")
    expect(c.location).toBe("Bengaluru, India")
    expect(c.experience).toBe("5-7 yrs")
    expect(c.salary).toBe("₹12-18 LPA")
    expect(c.date).toBe("2026-07-01")
    expect(c.url).toBe("https://www.foundit.in/job/senior-python-developer-acme-58325394")
  })

  test("returns total count from the response", () => {
    const { total } = parseSearchResponse({
      jobSearchResponse: { data: [], totalCount: 42 },
    })
    expect(total).toBe(42)
  })

  test("hides salary and company when flagged", () => {
    const { cards } = parseSearchResponse({
      jobSearchResponse: { data: [rawJob({ hideSalary: true, hideCompanyName: true })] },
    })
    expect(cards[0].salary).toBeNull()
    expect(cards[0].company).toBeNull()
  })

  test("treats zero salary bounds as undisclosed", () => {
    const { cards } = parseSearchResponse({
      jobSearchResponse: {
        data: [
          rawJob({
            minimumSalary: { currency: "INR", absoluteValue: 0 },
            maximumSalary: { currency: "INR", absoluteValue: 0 },
          }),
        ],
      },
    })
    expect(cards[0].salary).toBeNull()
  })

  test("falls back to a constructed URL when no seoJdUrl", () => {
    const { cards } = parseSearchResponse({
      jobSearchResponse: { data: [rawJob({ seoJdUrl: undefined, jdUrl: undefined })] },
    })
    expect(cards[0].url).toBe("https://www.foundit.in/job/58325394")
  })

  test("tolerates a malformed response", () => {
    expect(parseSearchResponse(null).cards).toEqual([])
    expect(parseSearchResponse({}).cards).toEqual([])
    expect(parseSearchResponse({ jobSearchResponse: {} }).cards).toEqual([])
  })
})

describe("parseDetailResponse", () => {
  test("extracts description as plain text", () => {
    const job = parseDetailResponse({
      jobDetailResponse: rawJob({
        description: "<p>Build <strong>APIs</strong>.</p><ul><li>Python</li><li>AWS</li></ul>",
        functions: ["Engineering"],
        industries: ["IT Services"],
        applyUrl: "https://example.com/apply",
      }),
    })
    expect(job).not.toBeNull()
    expect(job!.description).toContain("Build APIs.")
    expect(job!.description).toContain("• Python")
    expect(job!.functions).toBe("Engineering")
    expect(job!.industries).toBe("IT Services")
    expect(job!.applyUrl).toBe("https://example.com/apply")
  })

  test("returns null for a missing job", () => {
    expect(parseDetailResponse({})).toBeNull()
    expect(parseDetailResponse({ jobDetailResponse: {} })).toBeNull()
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
    employmentType: null,
    skills: null,
    url: "u",
  })

  test("drops cards older than the cutoff, keeps undated ones", () => {
    const old = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
    const fresh = new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10)
    const out = filterByAge([card(old), card(fresh), card(null)], 14)
    expect(out.map((c) => c.date)).toEqual([fresh, null])
  })

  test("passes everything through when disabled", () => {
    const cards = [card("2020-01-01")]
    expect(filterByAge(cards, 9999)).toEqual(cards)
    expect(filterByAge(cards, 0)).toEqual(cards)
  })
})

describe("htmlToText", () => {
  test("decodes entities and preserves list structure", () => {
    const text = htmlToText("<p>R&amp;D role &#x2013; Bengaluru</p><ul><li>5+ yrs</li></ul>")
    expect(text).toContain("R&D role – Bengaluru")
    expect(text).toContain("• 5+ yrs")
  })
})
