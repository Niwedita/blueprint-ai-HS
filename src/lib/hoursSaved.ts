import type { Blueprint } from "./blueprint.functions";

export interface HoursSavedEstimate {
  manualHours: number;
  aiMinutes: number;
  savedHours: number;
  savedMinutes: number;
  drivers: { label: string; hours: number }[];
}

const BASELINE_HOURS = 4; // discovery synthesis, exec summary, edition comparison, roadmap framing

export function estimateHoursSaved(
  blueprint: Blueprint,
  documentText: string,
): HoursSavedEstimate {
  const words = (documentText || "").trim().split(/\s+/).filter(Boolean).length;

  // Reading + synthesis: ~500 words per 15 min of consultant time
  const docHours = Math.min(12, (words / 500) * 0.25);

  const objects = blueprint.crm_blueprint?.objects?.length ?? 0;
  const associations = blueprint.crm_blueprint?.associations?.length ?? 0;
  const crmHours = objects * 0.6 + associations * 0.3;

  const automations = blueprint.automations?.length ?? 0;
  const automationHours = automations * 0.75;

  const recCount =
    (blueprint.recommended_hubs?.length ?? 0) +
    (blueprint.pipelines?.length ?? 0) +
    (blueprint.property_recommendations?.length ?? 0) +
    (blueprint.integrations?.length ?? 0) +
    (blueprint.reporting_recommendations?.length ?? 0);
  const recHours = recCount * 0.35;

  const risks = blueprint.risks?.length ?? 0;
  const gaps = blueprint.missing_discovery_information?.length ?? 0;
  const advisoryHours = risks * 0.25 + gaps * 0.15;

  const rawTotal =
    BASELINE_HOURS +
    docHours +
    crmHours +
    automationHours +
    recHours +
    advisoryHours;

  const manualHours = Math.max(6, Math.round(rawTotal));
  const aiMinutes = 2;
  const totalSavedMin = manualHours * 60 - aiMinutes;
  const savedHours = Math.floor(totalSavedMin / 60);
  const savedMinutes = totalSavedMin % 60;

  return {
    manualHours,
    aiMinutes,
    savedHours,
    savedMinutes,
    drivers: [
      { label: "Document review & synthesis", hours: round1(docHours) },
      { label: "CRM architecture design", hours: round1(crmHours) },
      { label: "Automation design", hours: round1(automationHours) },
      { label: "Recommendations authoring", hours: round1(recHours) },
      { label: "Risks & discovery gap analysis", hours: round1(advisoryHours) },
      { label: "Baseline deliverables", hours: BASELINE_HOURS },
    ],
  };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
