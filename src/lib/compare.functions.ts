import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  current: z.object({
    filename: z.string().min(1).max(300),
    text: z.string().min(20).max(180_000),
  }),
  previous: z.object({
    filename: z.string().min(1).max(300),
    text: z.string().min(20).max(180_000),
  }),
});

export type DiffDirection = "added" | "removed" | "changed" | "unchanged";

export type DiffItem = {
  label: string;
  direction: DiffDirection;
  previous: string;
  current: string;
  impact: string;
};

export type DiffCategory = {
  category:
    | "Goals"
    | "Requirements"
    | "Risks"
    | "Readiness"
    | "Architecture"
    | "Budget"
    | "Timeline";
  summary: string;
  net_change: "improved" | "regressed" | "neutral" | "mixed";
  items: DiffItem[];
};

export type DifferenceReport = {
  headline: string;
  overall_verdict: "improved" | "regressed" | "neutral" | "mixed";
  readiness_delta: {
    previous_score: string;
    current_score: string;
    delta: string;
    explanation: string;
  };
  key_shifts: string[];
  new_risks: string[];
  resolved_risks: string[];
  new_requirements: string[];
  dropped_requirements: string[];
  categories: DiffCategory[];
  recommended_next_actions: string[];
};

const strArr = { type: "array", items: { type: "string" } } as const;
const obj = (props: Record<string, unknown>, required: string[]) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties: props,
});

const diffItem = obj(
  {
    label: { type: "string" },
    direction: {
      type: "string",
      enum: ["added", "removed", "changed", "unchanged"],
    },
    previous: { type: "string" },
    current: { type: "string" },
    impact: { type: "string" },
  },
  ["label", "direction", "previous", "current", "impact"],
);

const diffCategory = obj(
  {
    category: {
      type: "string",
      enum: [
        "Goals",
        "Requirements",
        "Risks",
        "Readiness",
        "Architecture",
        "Budget",
        "Timeline",
      ],
    },
    summary: { type: "string" },
    net_change: {
      type: "string",
      enum: ["improved", "regressed", "neutral", "mixed"],
    },
    items: { type: "array", items: diffItem },
  },
  ["category", "summary", "net_change", "items"],
);

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "overall_verdict",
    "readiness_delta",
    "key_shifts",
    "new_risks",
    "resolved_risks",
    "new_requirements",
    "dropped_requirements",
    "categories",
    "recommended_next_actions",
  ],
  properties: {
    headline: { type: "string" },
    overall_verdict: {
      type: "string",
      enum: ["improved", "regressed", "neutral", "mixed"],
    },
    readiness_delta: obj(
      {
        previous_score: { type: "string" },
        current_score: { type: "string" },
        delta: { type: "string" },
        explanation: { type: "string" },
      },
      ["previous_score", "current_score", "delta", "explanation"],
    ),
    key_shifts: strArr,
    new_risks: strArr,
    resolved_risks: strArr,
    new_requirements: strArr,
    dropped_requirements: strArr,
    categories: { type: "array", items: diffCategory },
    recommended_next_actions: strArr,
  },
} as const;

const SYSTEM_PROMPT = `You are a Senior HubSpot Solution Architect comparing two client discovery documents for the SAME engagement — a "previous" version and a "current" version — to produce a Difference Report a consultant will present to the client.

RULES
1. Never hallucinate. Only cite facts present in one or both documents. Where a fact appears in only one, mark it as added or removed accordingly.
2. Compare across exactly these seven categories, in this order: Goals, Requirements, Risks, Readiness, Architecture, Budget, Timeline. Include one entry per category, even if items is empty.
3. Each item has: label (short topic), direction (added/removed/changed/unchanged), previous (verbatim or tight paraphrase from the previous document, or "Not present"), current (verbatim or tight paraphrase from the current document, or "Not present"), impact (one sentence: what this shift means for the HubSpot implementation).
4. Prefer "changed" when the topic exists in both but details differ. Use "unchanged" sparingly and only for material facts worth reassuring the client about.
5. net_change per category: "improved" (clearer / de-risked / better funded / more time), "regressed" (less clear / new risk / lower budget / compressed timeline), "neutral", or "mixed".
6. readiness_delta: infer a 0–100 readiness score for each document based on clarity, completeness and complexity, and express the delta (e.g. "+12", "-8", "0"). Explanation cites the biggest driver.
7. key_shifts: 3–6 bullet-length statements a partner would read aloud to open a client conversation.
8. new_risks / resolved_risks / new_requirements / dropped_requirements: concise phrases only.
9. recommended_next_actions: 3–5 concrete follow-ups the consultant should take before the next client meeting.
10. Tone: presentation-ready, client-facing, senior consultant. No filler, no hedging.`;

export const compareDiscoveries = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5.6-terra",
          service_tier: "priority",
          reasoning_effort: "none",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Compare these two HubSpot discovery documents for the same engagement and produce a structured Difference Report.\n\n=== PREVIOUS DISCOVERY: "${data.previous.filename}" ===\n${data.previous.text}\n\n=== CURRENT DISCOVERY: "${data.current.filename}" ===\n${data.current.text}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "difference_report",
              strict: true,
              schema,
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429)
        throw new Error("Rate limit reached. Please try again in a moment.");
      if (response.status === 402)
        throw new Error("AI credits exhausted. Add credits in Lovable settings.");
      throw new Error(`AI request failed [${response.status}]: ${body}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");

    const report = JSON.parse(content) as DifferenceReport;
    return {
      report,
      currentFilename: data.current.filename,
      previousFilename: data.previous.filename,
    };
  });
