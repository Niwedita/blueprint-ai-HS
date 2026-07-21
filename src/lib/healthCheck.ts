import type { Blueprint } from "@/lib/blueprint.functions";

export type HealthTier = "poor" | "fair" | "good" | "excellent";

export interface HealthDimension {
  key: string;
  label: string;
  score: number; // 0-100
  tier: HealthTier;
  recommendation: string;
}

export type MaturityLevel = "Beginner" | "Intermediate" | "Advanced" | "Enterprise";

export interface HealthCheckResult {
  dimensions: HealthDimension[];
  overallScore: number;
  maturity: MaturityLevel;
  maturitySummary: string;
}

function tierFor(score: number): HealthTier {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 45) return "fair";
  return "poor";
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function scale(count: number, min: number, ideal: number) {
  if (count <= min) return Math.round((count / Math.max(1, min)) * 40);
  if (count >= ideal) return 100;
  const span = ideal - min;
  return Math.round(40 + ((count - min) / span) * 60);
}

function recommendationFor(label: string, score: number): string {
  if (score >= 85)
    return `${label} is in excellent shape — maintain standards and use as a reference for future initiatives.`;
  if (score >= 70)
    return `${label} is solid. Tighten the remaining gaps to reach enterprise-grade maturity.`;
  if (score >= 45)
    return `${label} is workable but under-defined. Invest in the missing discovery items before build.`;
  return `${label} is a critical gap. Run a focused workshop with the client before implementation kicks off.`;
}

export function computeHealthCheck(blueprint: Blueprint): HealthCheckResult {
  const missingCount = blueprint.missing_discovery_information.length;
  const highRisks = blueprint.risks.filter((r) => r.severity === "high").length;
  const mediumRisks = blueprint.risks.filter((r) => r.severity === "medium").length;

  // Discovery Quality — evidence density vs gaps
  const discovery = clamp(
    scale(blueprint.discovery_facts.length, 3, 12) - missingCount * 5,
  );

  // CRM Complexity — depth of the data model (higher score = better designed, not "more complex")
  const objects = blueprint.crm_blueprint.objects.length;
  const associations = blueprint.crm_blueprint.associations.length;
  const crm = clamp(scale(objects, 2, 6) * 0.6 + scale(associations, 1, 6) * 0.4);

  // Automation Maturity
  const automation = clamp(scale(blueprint.automations.length, 2, 10));

  // Data Readiness — property coverage tempered by discovery gaps
  const propCount = blueprint.property_recommendations.length;
  const data = clamp(scale(propCount, 4, 20) - missingCount * 4);

  // Integration Readiness
  const integration = clamp(scale(blueprint.integrations.length, 1, 5));

  // Reporting Maturity
  const reporting = clamp(scale(blueprint.reporting_recommendations.length, 2, 8));

  // Governance — roadmap coverage minus unmitigated high risks
  const roadmapPhases = blueprint.implementation_roadmap.length;
  const governance = clamp(
    scale(roadmapPhases, 2, 5) - highRisks * 10 - mediumRisks * 3,
  );

  const dimensions: HealthDimension[] = [
    { key: "discovery", label: "Discovery Quality", score: discovery, tier: tierFor(discovery), recommendation: recommendationFor("Discovery quality", discovery) },
    { key: "crm", label: "CRM Complexity", score: crm, tier: tierFor(crm), recommendation: recommendationFor("The CRM data model", crm) },
    { key: "automation", label: "Automation Maturity", score: automation, tier: tierFor(automation), recommendation: recommendationFor("Automation coverage", automation) },
    { key: "data", label: "Data Readiness", score: data, tier: tierFor(data), recommendation: recommendationFor("Data readiness", data) },
    { key: "integration", label: "Integration Readiness", score: integration, tier: tierFor(integration), recommendation: recommendationFor("Integration readiness", integration) },
    { key: "reporting", label: "Reporting Maturity", score: reporting, tier: tierFor(reporting), recommendation: recommendationFor("Reporting maturity", reporting) },
    { key: "governance", label: "Governance", score: governance, tier: tierFor(governance), recommendation: recommendationFor("Governance & delivery structure", governance) },
  ];

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length,
  );

  const maturity: MaturityLevel =
    overallScore >= 82
      ? "Enterprise"
      : overallScore >= 65
        ? "Advanced"
        : overallScore >= 45
          ? "Intermediate"
          : "Beginner";

  const maturitySummary =
    maturity === "Enterprise"
      ? "This engagement is enterprise-ready — evidence, architecture and governance are all aligned."
      : maturity === "Advanced"
        ? "The blueprint is production-grade. Close the remaining gaps to reach enterprise maturity."
        : maturity === "Intermediate"
          ? "Foundations are in place but several dimensions need sharper discovery before build."
          : "Early-stage engagement. Prioritise a structured discovery workshop before committing to a build plan.";

  return { dimensions, overallScore, maturity, maturitySummary };
}
