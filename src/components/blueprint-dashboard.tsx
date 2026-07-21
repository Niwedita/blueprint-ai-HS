import type { Blueprint, ExecutiveSnapshot, RecommendationMeta } from "@/lib/blueprint.functions";
import { BlueprintCopilot } from "@/components/blueprint-copilot";
import { estimateHoursSaved } from "@/lib/hoursSaved";
import { computeHealthCheck, type HealthDimension, type HealthTier } from "@/lib/healthCheck";
import { cn } from "@/lib/utils";

import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  Cog,
  DollarSign,
  FileText,
  Flame,
  GaugeCircle,
  GitBranch,
  HelpCircle,
  Layers,
  Lightbulb,
  ListChecks,
  Map,
  Plug,
  Scale,
  ShieldAlert,
  Sparkles,
  Star,
  Tags,
  Target,
  Download,
  Presentation,
  Clock,
  Timer,
  Zap,

  RefreshCw,
  BarChart3,
  Users,
  Workflow,
  X,
} from "lucide-react";


const NA = "Not Available";

function orNA(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : NA;
}

function EmptyState({ label = NA }: { label?: string }) {
  return (
    <p className="text-sm italic text-muted-foreground">{label}</p>
  );
}

function ConfidenceBadge({ level }: { level?: RecommendationMeta["confidence"] }) {
  const l = level ?? "medium";
  const map = {
    high: "border-success/30 bg-success/10 text-success",
    medium: "border-accent/30 bg-accent/10 text-accent",
    low: "border-warning/30 bg-warning/10 text-warning",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[l],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {l} confidence
    </span>
  );
}

function RecMeta({ meta }: { meta: Partial<RecommendationMeta> | undefined }) {
  if (!meta) return null;
  const rows: { label: string; value: string }[] = [
    { label: "Why", value: orNA(meta.why) },
    { label: "Evidence", value: orNA(meta.evidence) },
    { label: "Business impact", value: orNA(meta.business_impact) },
    { label: "Expected ROI", value: orNA(meta.expected_roi) },
    { label: "Alternative", value: orNA(meta.alternative) },
    { label: "Why not that", value: orNA(meta.why_not_another_option) },
    { label: "Risk", value: orNA(meta.risks) },
    { label: "Assumption", value: orNA(meta.assumptions) },
  ];
  return (
    <details className="group mt-3 rounded-lg border border-border/70 bg-muted/30 open:bg-muted/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground/80 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Lightbulb className="h-3 w-3 text-accent" />
          Consultant Reasoning
        </span>
        <span className="inline-flex items-center gap-2">
          <ConfidenceBadge level={meta.confidence} />
          <ArrowUpRight className="h-3 w-3 text-muted-foreground transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <dl className="space-y-1.5 border-t border-border/70 px-3 py-3">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[110px_1fr] gap-2 text-xs">
            <dt className="font-medium text-foreground/70">{r.label}</dt>
            <dd className="text-muted-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}



interface Props {
  filename: string;
  blueprint: Blueprint;
  documentText: string;
  onReset: () => void;
  onExport: () => void;
  onExportPptx: () => void;
}


export function BlueprintDashboard({ filename, blueprint, documentText, onReset, onExport, onExportPptx }: Props) {
  return (
    <div className="space-y-8">
      <DashboardHeader
        filename={filename}
        readiness={blueprint.readiness}
        onReset={onReset}
        onExport={onExport}
        onExportPptx={onExportPptx}
      />


      <ExecutiveDashboard snapshot={blueprint.executive_snapshot} />

      <HoursSavedBanner blueprint={blueprint} documentText={documentText} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Module
          className="lg:col-span-2"
          icon={FileText}
          title="Executive Summary"
          eyebrow="Overview"
        >
          <p className="text-[15px] leading-relaxed text-foreground/90">
            {orNA(blueprint.executive_summary)}
          </p>

        </Module>

        <Module icon={GaugeCircle} title="Implementation Readiness" eyebrow="Score">
          <ReadinessGauge readiness={blueprint.readiness} />
        </Module>
      </div>

      <BlueprintCopilot blueprint={blueprint} documentText={documentText} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">


        <Module icon={Building2} title="Company Information" eyebrow="Client">
          <CompanyInfo info={blueprint.company_information} />
        </Module>

        <Module icon={Target} title="Business Goals" eyebrow="Outcomes">
          {blueprint.business_goals.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-4">
              {blueprint.business_goals.map((g, i) => (
                <li key={i} className="border-l-2 border-accent/50 pl-3">
                  <p className="text-sm font-semibold text-foreground">{orNA(g.title)}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{orNA(g.description)}</p>
                </li>
              ))}
            </ul>
          )}
        </Module>

        <Module icon={Flame} title="Current Challenges" eyebrow="Pains">
          {blueprint.current_challenges.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {blueprint.current_challenges.map((c, i) => (
                <li key={i} className="rounded-lg bg-muted/60 p-3">
                  <p className="text-sm font-semibold text-foreground">{orNA(c.title)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground/70">Impact: </span>
                    {orNA(c.impact)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Module>

        <Module
          className="lg:col-span-2"
          icon={BookOpen}
          title="Discovery Facts"
          eyebrow="Evidence from document"
        >
          {blueprint.discovery_facts.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {blueprint.discovery_facts.map((f, i) => (
                <li key={i} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {orNA(f.fact)}
                    </p>
                    <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {orNA(f.category)}
                    </span>
                  </div>
                  <p className="mt-1.5 border-l-2 border-accent/40 pl-2 text-xs italic leading-relaxed text-muted-foreground">
                    "{orNA(f.evidence)}"
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Module>

        <Module icon={Lightbulb} title="Key Insights" eyebrow="Inferred from facts">
          {blueprint.key_insights.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {blueprint.key_insights.map((k, i) => (
                <li key={i} className="rounded-lg bg-muted/60 p-3">
                  <p className="text-sm text-foreground">{orNA(k.insight)}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground/70">Based on: </span>
                    {orNA(k.based_on)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Module>




        <Module
          className="lg:col-span-3"
          icon={Layers}
          title="Recommended HubSpot Hubs & Editions"
          eyebrow="Stack"
        >
          {blueprint.recommended_hubs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blueprint.recommended_hubs.map((h, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-lift"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-foreground">{orNA(h.name)}</p>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                      {orNA(h.tier)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {orNA(h.rationale)}
                  </p>
                  <RecMeta meta={h} />
                </div>
              ))}
            </div>
          )}
        </Module>

        <Module
          className="lg:col-span-3"
          icon={Scale}
          title="Compare HubSpot Editions"
          eyebrow="Starter · Professional · Enterprise"
        >
          <EditionComparison comparison={blueprint.edition_comparison} />
        </Module>



        <Module
          className="lg:col-span-2"
          icon={Boxes}
          title="CRM Blueprint"
          eyebrow="Data Model"
        >
          {blueprint.crm_blueprint.objects.length === 0 &&
          blueprint.crm_blueprint.associations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {blueprint.crm_blueprint.objects.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {blueprint.crm_blueprint.objects.map((o, i) => (
                    <div key={i} className="rounded-lg bg-muted/60 p-4">
                      <p className="text-sm font-semibold text-foreground">{orNA(o.name)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{orNA(o.purpose)}</p>
                      {o.key_properties.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {o.key_properties.map((p, j) => (
                            <span
                              key={j}
                              className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground/80"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {blueprint.crm_blueprint.associations.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Associations
                  </p>
                  <ul className="space-y-1.5">
                    {blueprint.crm_blueprint.associations.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 font-mono text-xs text-foreground/80"
                      >
                        <ArrowUpRight className="h-3 w-3 text-accent" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Module>

        <Module icon={GitBranch} title="Pipelines" eyebrow="Process">
          {blueprint.pipelines.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-5">
              {blueprint.pipelines.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-2 flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-foreground">{orNA(p.name)}</p>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {orNA(p.type)}
                    </span>
                  </div>
                  {p.stages.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {p.stages.map((s, j) => (
                        <span key={j} className="flex items-center">
                          <span className="rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                            {s}
                          </span>
                          {j < p.stages.length - 1 && (
                            <span className="mx-1 text-muted-foreground">›</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  <RecMeta meta={p} />
                </div>
              ))}
            </div>
          )}
        </Module>

        <Module
          className="lg:col-span-3"
          icon={Tags}
          title="Property Recommendations"
          eyebrow="Custom Fields"
        >
          {blueprint.property_recommendations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {blueprint.property_recommendations.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-foreground">
                      {orNA(p.object)} · {orNA(p.name)}
                    </p>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {orNA(p.type)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{orNA(p.purpose)}</p>
                  <RecMeta meta={p} />
                </div>
              ))}
            </div>
          )}
        </Module>

        <Module
          className="lg:col-span-2"
          icon={Cog}
          title="Automation Opportunities"
          eyebrow="Workflows"
        >
          {blueprint.automations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {blueprint.automations.map((a, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-foreground">{orNA(a.name)}</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="grid grid-cols-[64px_1fr] gap-2">
                      <dt className="font-semibold text-foreground/70">Trigger</dt>
                      <dd className="text-muted-foreground">{orNA(a.trigger)}</dd>
                    </div>
                    <div className="grid grid-cols-[64px_1fr] gap-2">
                      <dt className="font-semibold text-foreground/70">Outcome</dt>
                      <dd className="text-muted-foreground">{orNA(a.outcome)}</dd>
                    </div>
                  </dl>
                  <RecMeta meta={a} />
                </div>
              ))}
            </div>
          )}
        </Module>

        <Module icon={Plug} title="Integrations" eyebrow="Ecosystem">
          {blueprint.integrations.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {blueprint.integrations.map((it, i) => (
                <li key={i} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{orNA(it.name)}</p>
                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {orNA(it.method)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {orNA(it.purpose)}
                  </p>
                  <RecMeta meta={it} />
                </li>
              ))}
            </ul>
          )}
        </Module>

        <Module
          className="lg:col-span-2"
          icon={BarChart3}
          title="Reporting Recommendations"
          eyebrow="Dashboards"
        >
          {blueprint.reporting_recommendations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {blueprint.reporting_recommendations.map((r, i) => (
                <div key={i} className="rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{orNA(r.name)}</p>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {orNA(r.audience)}
                    </span>
                  </div>
                  {r.metrics.length === 0 ? (
                    <p className="mt-2 text-xs italic text-muted-foreground">{NA}</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.metrics.map((m, j) => (
                        <span
                          key={j}
                          className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  <RecMeta meta={r} />
                </div>
              ))}
            </div>
          )}
        </Module>

        <Module icon={ShieldAlert} title="Implementation Risks" eyebrow="Watch">
          {blueprint.risks.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {blueprint.risks.map((r, i) => (
                <li key={i} className="rounded-lg bg-muted/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{orNA(r.risk)}</p>
                    <SeverityBadge severity={r.severity} />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground/70">Mitigation: </span>
                    {orNA(r.mitigation)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Module>

        <Module
          className="lg:col-span-3"
          icon={Map}
          title="Implementation Roadmap"
          eyebrow="Delivery Plan"
        >
          {blueprint.implementation_roadmap.length === 0 ? (
            <EmptyState />
          ) : (
            <ol className="relative grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {blueprint.implementation_roadmap.map((p, i) => (
                <li
                  key={i}
                  className="relative rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 font-mono text-[11px] font-semibold text-accent">
                      {i + 1}
                    </span>
                    <p className="text-sm font-semibold text-foreground">{orNA(p.phase)}</p>
                  </div>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {orNA(p.duration)}
                  </p>
                  {p.objectives.length === 0 ? (
                    <p className="mt-3 text-xs italic text-muted-foreground">{NA}</p>
                  ) : (
                    <ul className="mt-3 space-y-1.5">
                      {p.objectives.map((o, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-1.5 text-xs text-foreground/85"
                        >
                          <ListChecks className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Module>

        <Module
          className="lg:col-span-3"
          icon={HelpCircle}
          title="Missing Discovery Information"
          eyebrow="Ask the client"
        >
          {blueprint.missing_discovery_information.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {blueprint.missing_discovery_information.map((m, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-[11px] text-accent">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {orNA(m.topic)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground/70">
                          Why it matters:{" "}
                        </span>
                        {orNA(m.why_it_matters)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground/70">
                          Sharpens:{" "}
                        </span>
                        {orNA(m.affected_recommendation)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Module>

      </div>

      <BlueprintHealthCheck blueprint={blueprint} />
    </div>
  );
}


function CompanyInfo({ info }: { info: Blueprint["company_information"] }) {
  const rows: [string, string][] = [
    ["Company", info.name],
    ["Industry", info.industry],
    ["Size", info.size],
    ["Region", info.region],
    ["Business model", info.business_model],
  ];
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {k}
            </dt>
            <dd className="text-sm text-foreground">{orNA(v)}</dd>
          </div>
        ))}
      </dl>
      {info.notes && (
        <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          {info.notes}
        </p>
      )}
    </div>
  );
}

function DashboardHeader({
  filename,
  readiness,
  onReset,
  onExport,
  onExportPptx,
}: {
  filename: string;
  readiness: Blueprint["readiness"];
  onReset: () => void;
  onExport: () => void;
  onExportPptx: () => void;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Implementation Blueprint
        </p>
        <h1 className="mt-1 font-display text-4xl leading-tight text-foreground">
          {stripExtension(filename)}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span
            className={cn(
              "inline-flex h-1.5 w-1.5 rounded-full",
              readiness.rating === "high"
                ? "bg-success"
                : readiness.rating === "medium"
                  ? "bg-warning"
                  : "bg-destructive",
            )}
          />
          Readiness score {Math.round(readiness.score)}/100 · {readiness.rating}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onExportPptx}
          className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-medium text-primary shadow-panel transition-colors hover:bg-primary/10"
        >
          <Presentation className="h-4 w-4" />
          Generate Client Presentation
        </button>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground shadow-panel transition-colors hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Download PDF Report
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New blueprint
        </button>
      </div>
    </div>
  );
}


type KpiIcon = React.ComponentType<{ className?: string }>;

const KPI_META: {
  key: keyof ExecutiveSnapshot;
  label: string;
  icon: KpiIcon;
  accent: string;
}[] = [
  { key: "readiness_score", label: "Implementation Readiness", icon: GaugeCircle, accent: "text-accent" },
  { key: "recommended_edition", label: "Recommended HubSpot Edition", icon: Sparkles, accent: "text-primary" },
  { key: "estimated_duration", label: "Estimated Duration", icon: CalendarClock, accent: "text-accent" },
  { key: "estimated_consulting_effort", label: "Consulting Effort", icon: Users, accent: "text-primary" },
  { key: "estimated_subscription_tier", label: "Subscription Tier", icon: DollarSign, accent: "text-accent" },
  { key: "overall_project_risk", label: "Overall Project Risk", icon: ShieldAlert, accent: "text-warning" },
  { key: "estimated_workflows", label: "Estimated Workflows", icon: Workflow, accent: "text-primary" },
  { key: "estimated_custom_properties", label: "Custom Properties", icon: Tags, accent: "text-accent" },
];

function HoursSavedBanner({
  blueprint,
  documentText,
}: {
  blueprint: Blueprint;
  documentText: string;
}) {
  const est = estimateHoursSaved(blueprint, documentText);
  const savedLabel =
    est.savedMinutes === 0
      ? `${est.savedHours} hours`
      : `${est.savedHours} hours ${est.savedMinutes} minutes`;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-foreground shadow-lift md:p-8">
      <div className="absolute inset-0 grid-bg opacity-10" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              Consultant Productivity
            </p>
            <h2 className="text-sm font-semibold leading-none text-white">
              Estimated Consultant Hours Saved
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat
            icon={Clock}
            label="Estimated Manual Consulting Time"
            value={`${est.manualHours} hours`}
            tone="muted"
          />
          <Stat
            icon={Timer}
            label="Blueprint AI Time"
            value={`${est.aiMinutes} minutes`}
            tone="muted"
          />
          <Stat
            icon={Sparkles}
            label="Estimated Time Saved"
            value={savedLabel}
            tone="highlight"
          />
        </div>

        <details className="group mt-5">
          <summary className="cursor-pointer list-none text-xs font-medium text-white/80 underline-offset-4 hover:underline">
            How this is estimated
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-lg border border-white/15 bg-white/5 p-4 text-xs text-white/85 md:grid-cols-3">
            {est.drivers.map((d) => (
              <div key={d.label} className="flex items-center justify-between gap-3">
                <span className="text-white/70">{d.label}</span>
                <span className="font-mono font-semibold text-white">
                  {d.hours}h
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/60">
            Based on document length, recommendation volume, CRM complexity,
            automation complexity, and typical HubSpot consulting effort.
          </p>
        </details>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "muted" | "highlight";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 backdrop-blur-sm",
        tone === "highlight"
          ? "border-white/40 bg-white/15"
          : "border-white/15 bg-white/5",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-white/80" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "font-display leading-tight tracking-tight text-white",
          tone === "highlight" ? "text-3xl md:text-4xl" : "text-2xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ExecutiveDashboard({ snapshot }: { snapshot: ExecutiveSnapshot | undefined }) {
  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-surface p-6 shadow-panel">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Executive Dashboard
            </p>
            <h2 className="text-sm font-semibold leading-none text-foreground">
              Project snapshot at a glance
            </h2>
          </div>
        </div>
        <span className="hidden text-xs text-muted-foreground md:inline">
          Read in under 30 seconds
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_META.map(({ key, label, icon: Icon, accent }) => {
          const card = snapshot?.[key];
          return (
            <div
              key={key}
              className="group relative flex flex-col gap-2 rounded-xl border border-border/70 bg-background/60 p-4 transition-shadow hover:shadow-lift"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-muted/60", accent)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="font-display text-xl leading-tight tracking-tight text-foreground">
                {orNA(card?.value)}
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                {orNA(card?.explanation)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Module({
  icon: Icon,
  title,
  eyebrow,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={`section-${slugify(title)}`}
      data-section-title={title}
      className={cn(
        "scroll-mt-24 rounded-xl border border-border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2.5 border-b border-border pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="text-sm font-semibold leading-none text-foreground">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}


function ReadinessGauge({ readiness }: { readiness: Blueprint["readiness"] }) {
  const score = Math.max(0, Math.min(100, Math.round(readiness.score)));
  const color =
    readiness.rating === "high"
      ? "var(--color-success)"
      : readiness.rating === "medium"
        ? "var(--color-warning)"
        : "var(--color-destructive)";
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-6xl leading-none tracking-tight text-foreground">
          {score}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {orNA(readiness.reasoning)}
      </p>

    </div>
  );
}

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const styles: Record<typeof severity, string> = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/15 text-warning-foreground border-warning/30",
    high: "bg-destructive/10 text-destructive border-destructive/25",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        styles[severity],
      )}
    >
      {severity}
    </span>
  );
}

function stripExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

const EDITION_ORDER = ["Starter", "Professional", "Enterprise"] as const;

function EditionComparison({
  comparison,
}: {
  comparison: Blueprint["edition_comparison"] | undefined;
}) {
  if (!comparison || !comparison.editions || comparison.editions.length === 0) {
    return <EmptyState />;
  }
  const byName: Record<string, Blueprint["edition_comparison"]["editions"][number]> = {};
  for (const e of comparison.editions) byName[e.edition] = e;
  const ordered = EDITION_ORDER.map((name) => byName[name]).filter(
    (e): e is Blueprint["edition_comparison"]["editions"][number] => Boolean(e),
  );

  return (
    <div className="space-y-4">
      {comparison.summary && (
        <p className="text-sm leading-relaxed text-foreground/90">
          {orNA(comparison.summary)}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ordered.map((e) => {
          const recommended = e.recommended;
          return (
            <div
              key={e.edition}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-surface p-5 transition-shadow",
                recommended
                  ? "border-accent/60 bg-accent/[0.04] shadow-lift ring-1 ring-accent/40"
                  : "border-border",
              )}
            >
              {recommended && (
                <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground shadow-panel">
                  <Star className="h-3 w-3" />
                  Recommended
                </span>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-xl text-foreground">{e.edition}</p>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  HubSpot
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground/80">
                {orNA(e.estimated_cost)}
              </p>

              <div className="mt-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Features
                </p>
                {e.features.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ul className="space-y-1">
                    {e.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-foreground/85"
                      >
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                    Pros
                  </p>
                  {e.pros.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <ul className="space-y-1">
                      {e.pros.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-foreground/85"
                        >
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                    Cons
                  </p>
                  {e.cons.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <ul className="space-y-1">
                      {e.cons.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-xs text-foreground/85"
                        >
                          <X className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/70 pt-3 text-xs">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Why recommended
                  </p>
                  <p className="mt-0.5 leading-relaxed text-foreground/80">
                    {orNA(e.why_recommended)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Why not recommended
                  </p>
                  <p className="mt-0.5 leading-relaxed text-foreground/80">
                    {orNA(e.why_not_recommended)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const TIER_STYLES: Record<HealthTier, { bar: string; ring: string; chip: string; dot: string; label: string }> = {
  excellent: {
    bar: "bg-success",
    ring: "border-success/40 bg-success/5",
    chip: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
    label: "Excellent",
  },
  good: {
    bar: "bg-accent",
    ring: "border-accent/40 bg-accent/5",
    chip: "border-accent/30 bg-accent/10 text-accent",
    dot: "bg-accent",
    label: "Good",
  },
  fair: {
    bar: "bg-warning",
    ring: "border-warning/40 bg-warning/5",
    chip: "border-warning/30 bg-warning/10 text-warning",
    dot: "bg-warning",
    label: "Fair",
  },
  poor: {
    bar: "bg-destructive",
    ring: "border-destructive/40 bg-destructive/5",
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    label: "Needs work",
  },
};

const MATURITY_STEPS = ["Beginner", "Intermediate", "Advanced", "Enterprise"] as const;

function BlueprintHealthCheck({ blueprint }: { blueprint: Blueprint }) {
  const result = computeHealthCheck(blueprint);
  const activeIndex = MATURITY_STEPS.indexOf(result.maturity);

  return (
    <section id="section-health-check" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-panel md:p-8">
      <div className="flex flex-col gap-6 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Final assessment
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-foreground">
            Blueprint Health Check
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {result.maturitySummary}
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <div className="text-center">
            <div className="font-display text-3xl text-foreground">{result.overallScore}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Overall
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Maturity level
            </div>
            <div className="mt-0.5 font-display text-xl text-foreground">{result.maturity}</div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {MATURITY_STEPS.map((step, i) => (
            <span
              key={step}
              className={cn(
                "transition-colors",
                i <= activeIndex ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {step}
            </span>
          ))}
        </div>
        <div className="mt-2 flex h-2 items-center gap-1.5">
          {MATURITY_STEPS.map((step, i) => (
            <div
              key={step}
              className={cn(
                "h-full flex-1 rounded-full",
                i <= activeIndex ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {result.dimensions.map((d) => (
          <HealthDimensionCard key={d.key} dimension={d} />
        ))}
      </div>
    </section>
  );
}

function HealthDimensionCard({ dimension }: { dimension: HealthDimension }) {
  const style = TIER_STYLES[dimension.tier];
  return (
    <div className={cn("rounded-xl border p-5 transition-colors", style.ring)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Check className={cn("h-4 w-4", dimension.tier === "poor" ? "text-destructive" : "text-success")} />
          <p className="text-sm font-semibold text-foreground">{dimension.label}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            style.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
          {style.label}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-2xl text-foreground">{dimension.score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", style.bar)}
          style={{ width: `${Math.max(4, dimension.score)}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {dimension.recommendation}
      </p>
    </div>
  );
}
