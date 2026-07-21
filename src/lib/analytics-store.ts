import type { Blueprint } from "./blueprint.functions";

const STORAGE_KEY = "blueprint-ai:analytics:v1";

export type BlueprintRecord = {
  id: string;
  filename: string;
  createdAt: number;
  readinessScore: number;
  recommendedEdition: string;
  estimatedDuration: string;
  primaryHub: string;
  hubs: string[];
  risks: string[];
};

export type AnalyticsData = {
  records: BlueprintRecord[];
};

function safeParse(raw: string | null): AnalyticsData {
  if (!raw) return { records: [] };
  try {
    const parsed = JSON.parse(raw) as AnalyticsData;
    if (!parsed || !Array.isArray(parsed.records)) return { records: [] };
    return parsed;
  } catch {
    return { records: [] };
  }
}

export function readAnalytics(): AnalyticsData {
  if (typeof window === "undefined") return { records: [] };
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function clearAnalytics(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("blueprint-analytics:updated"));
}

export function recordBlueprint(filename: string, blueprint: Blueprint): void {
  if (typeof window === "undefined") return;
  const hubs = (blueprint.recommended_hubs ?? []).map((h) => h.name).filter(Boolean);
  const record: BlueprintRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filename,
    createdAt: Date.now(),
    readinessScore: Number(blueprint.readiness?.score ?? 0) || 0,
    recommendedEdition:
      blueprint.edition_comparison?.recommended_edition ||
      blueprint.executive_snapshot?.recommended_edition?.value ||
      "Unknown",
    estimatedDuration:
      blueprint.executive_snapshot?.estimated_duration?.value || "Unknown",
    primaryHub: hubs[0] || "Unknown",
    hubs,
    risks: (blueprint.risks ?? []).map((r) => r.risk).filter(Boolean),
  };
  const data = readAnalytics();
  data.records.unshift(record);
  // Cap to prevent unbounded growth
  data.records = data.records.slice(0, 500);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("blueprint-analytics:updated"));
}

// Parse duration strings like "8 weeks", "3-4 months", "12 wks" to weeks (number).
function parseDurationToWeeks(input: string): number | null {
  if (!input) return null;
  const s = input.toLowerCase();
  const numMatch = s.match(/(\d+(?:\.\d+)?)(?:\s*[-–to]+\s*(\d+(?:\.\d+)?))?/);
  if (!numMatch) return null;
  const a = parseFloat(numMatch[1]);
  const b = numMatch[2] ? parseFloat(numMatch[2]) : a;
  const avg = (a + b) / 2;
  if (/month/.test(s)) return avg * 4.345;
  if (/day/.test(s)) return avg / 7;
  if (/quarter/.test(s)) return avg * 13;
  if (/year/.test(s)) return avg * 52;
  return avg; // assume weeks
}

function topCount<T extends string>(items: T[]): { label: T; count: number }[] {
  const map = new Map<T, number>();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export type AnalyticsSummary = {
  total: number;
  averageReadiness: number | null;
  averageDurationLabel: string;
  averageDurationWeeks: number | null;
  mostRecommendedHub: string;
  hubBreakdown: { label: string; count: number }[];
  topRisks: { label: string; count: number }[];
  editionBreakdown: { label: string; count: number }[];
};

export function summarize(records: BlueprintRecord[]): AnalyticsSummary {
  const total = records.length;
  const scores = records.map((r) => r.readinessScore).filter((n) => n > 0);
  const avgReadiness = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const weeks = records
    .map((r) => parseDurationToWeeks(r.estimatedDuration))
    .filter((n): n is number => n !== null && !Number.isNaN(n));
  const avgWeeks = weeks.length
    ? weeks.reduce((a, b) => a + b, 0) / weeks.length
    : null;
  const avgDurationLabel =
    avgWeeks === null
      ? "Not available"
      : avgWeeks >= 8
        ? `${(avgWeeks / 4.345).toFixed(1)} months`
        : `${avgWeeks.toFixed(1)} weeks`;

  const hubBreakdown = topCount(records.flatMap((r) => r.hubs));
  const editionBreakdown = topCount(records.map((r) => r.recommendedEdition));
  const topRisks = topCount(records.flatMap((r) => r.risks)).slice(0, 5);

  return {
    total,
    averageReadiness: avgReadiness,
    averageDurationLabel: avgDurationLabel,
    averageDurationWeeks: avgWeeks,
    mostRecommendedHub: hubBreakdown[0]?.label ?? "Not available",
    hubBreakdown: hubBreakdown.slice(0, 5),
    topRisks,
    editionBreakdown,
  };
}
