import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Clock,
  FileStack,
  GaugeCircle,
  Layers,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { AppFooter, AppHeader } from "@/components/app-shell";
import {
  clearAnalytics,
  readAnalytics,
  summarize,
  type AnalyticsSummary,
  type BlueprintRecord,
} from "@/lib/analytics-store";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Blueprint AI" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content:
          "Admin analytics for Blueprint AI: usage volume, average readiness, most recommended HubSpot Hub, common risks.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [records, setRecords] = useState<BlueprintRecord[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = () => {
      const data = readAnalytics();
      setRecords(data.records);
      setSummary(summarize(data.records));
    };
    load();
    setHydrated(true);
    const handler = () => load();
    window.addEventListener("blueprint-analytics:updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("blueprint-analytics:updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const handleClear = () => {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      "Clear all locally-stored analytics? This cannot be undone.",
    );
    if (!ok) return;
    clearAnalytics();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                to="/"
                className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Blueprint
              </Link>
              <h1 className="font-display text-4xl leading-tight tracking-tight text-foreground">
                Admin analytics
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Usage metrics for Blueprint AI. Persisted locally in your browser
                (localStorage) — no backend database required.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear analytics
            </button>
          </div>

          {!hydrated ? null : records.length === 0 ? (
            <EmptyState />
          ) : summary ? (
            <>
              <KpiGrid summary={summary} />
              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <BreakdownCard
                  icon={Layers}
                  title="HubSpot Hub recommendations"
                  emptyLabel="No hub data yet"
                  items={summary.hubBreakdown}
                />
                <BreakdownCard
                  icon={ShieldAlert}
                  title="Most common implementation risks"
                  emptyLabel="No risks recorded"
                  items={summary.topRisks}
                />
              </div>
              <RecentTable records={records} />
            </>
          ) : null}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
      <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 className="mt-4 font-display text-2xl text-foreground">
        No blueprints yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Generate a blueprint from a discovery document and metrics will appear
        here automatically.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Generate a blueprint
      </Link>
    </div>
  );
}

function KpiGrid({ summary }: { summary: AnalyticsSummary }) {
  const kpis = [
    {
      icon: FileStack,
      label: "Blueprints generated",
      value: String(summary.total),
      hint: "Total documents analyzed",
    },
    {
      icon: GaugeCircle,
      label: "Average readiness score",
      value:
        summary.averageReadiness === null
          ? "—"
          : `${summary.averageReadiness}/100`,
      hint: "Across all generated blueprints",
    },
    {
      icon: Clock,
      label: "Average implementation duration",
      value: summary.averageDurationLabel,
      hint: "Estimated from executive snapshots",
    },
    {
      icon: Building2,
      label: "Most recommended Hub",
      value: summary.mostRecommendedHub,
      hint: "Highest-frequency HubSpot Hub",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map(({ icon: Icon, label, value, hint }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card p-5 shadow-panel"
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </div>
          <div className="mt-3 font-display text-3xl leading-tight text-foreground">
            {value}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
      ))}
    </div>
  );
}

function BreakdownCard({
  icon: Icon,
  title,
  items,
  emptyLabel,
}: {
  icon: typeof Layers;
  title: string;
  items: { label: string; count: number }[];
  emptyLabel: string;
}) {
  const max = items[0]?.count ?? 1;
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-panel">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{item.label}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {item.count}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecentTable({ records }: { records: BlueprintRecord[] }) {
  const rows = records.slice(0, 10);
  return (
    <div className="mt-8 rounded-xl border border-border bg-card shadow-panel">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">
          Recent blueprints
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Last {rows.length} of {records.length} recorded.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Document</th>
              <th className="px-5 py-3">Edition</th>
              <th className="px-5 py-3">Primary Hub</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3">Readiness</th>
              <th className="px-5 py-3">Generated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="max-w-[240px] truncate px-5 py-3 text-foreground">
                  {r.filename}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {r.recommendedEdition}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {r.primaryHub}
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {r.estimatedDuration}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-foreground">
                  {r.readinessScore}/100
                </td>
                <td className="px-5 py-3 text-muted-foreground">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
