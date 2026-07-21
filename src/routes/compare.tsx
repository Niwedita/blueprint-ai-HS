import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GitCompareArrows,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { AppFooter, AppHeader } from "@/components/app-shell";
import { extractText } from "@/lib/parseDocument";
import {
  compareDiscoveries,
  type DiffCategory,
  type DiffDirection,
  type DifferenceReport,
} from "@/lib/compare.functions";
import { cn } from "@/lib/utils";

type Status = "idle" | "parsing" | "analyzing" | "done" | "error";

export const Route = createFileRoute("/compare")({
  component: ComparePage,
  head: () => ({
    meta: [
      { title: "Compare Discoveries · Blueprint AI for HubSpot" },
      {
        name: "description",
        content:
          "Upload a previous and current HubSpot discovery document to generate an AI-powered Difference Report across goals, requirements, risks, readiness, architecture, budget and timeline.",
      },
    ],
  }),
});

interface Slot {
  file: File | null;
}

function ComparePage() {
  const compare = useServerFn(compareDiscoveries);
  const [previous, setPrevious] = useState<Slot>({ file: null });
  const [current, setCurrent] = useState<Slot>({ file: null });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    report: DifferenceReport;
    currentFilename: string;
    previousFilename: string;
  } | null>(null);

  const run = useCallback(async () => {
    if (!previous.file || !current.file) return;
    setError(null);
    setStatus("parsing");
    try {
      const [prevText, currText] = await Promise.all([
        extractText(previous.file),
        extractText(current.file),
      ]);
      if (prevText.trim().length < 40 || currText.trim().length < 40) {
        throw new Error(
          "One of the documents appears empty or unreadable. Try a text-based PDF or DOCX.",
        );
      }
      setStatus("analyzing");
      const res = await compare({
        data: {
          previous: {
            filename: previous.file.name,
            text: prevText.slice(0, 160_000),
          },
          current: {
            filename: current.file.name,
            text: currText.slice(0, 160_000),
          },
        },
      });
      setResult(res);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, [compare, previous.file, current.file]);

  const reset = () => {
    setResult(null);
    setPrevious({ file: null });
    setCurrent({ file: null });
    setStatus("idle");
    setError(null);
  };

  const isProcessing = status === "parsing" || status === "analyzing";
  const canRun = !!previous.file && !!current.file && !isProcessing;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        {result ? (
          <ReportView
            data={result}
            onReset={reset}
          />
        ) : (
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground shadow-panel">
                <GitCompareArrows className="h-3 w-3 text-accent" />
                New · Difference report
              </div>
              <h1 className="mt-6 font-display text-4xl leading-tight text-foreground md:text-5xl">
                Compare two discovery documents
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Upload a previous and current HubSpot discovery. Blueprint AI
                compares goals, requirements, risks, readiness, architecture,
                budget and timeline — and produces a client-ready Difference
                Report.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
              <FileSlot
                label="Previous discovery"
                hint="The earlier version — baseline for comparison"
                file={previous.file}
                onFile={(f) => setPrevious({ file: f })}
                disabled={isProcessing}
              />
              <FileSlot
                label="Current discovery"
                hint="The latest version — what changed"
                file={current.file}
                onFile={(f) => setCurrent({ file: f })}
                disabled={isProcessing}
                accent
              />
            </div>

            <div className="mx-auto mt-8 max-w-xl">
              <button
                type="button"
                disabled={!canRun}
                onClick={run}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all",
                  "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {status === "parsing"
                      ? "Reading documents…"
                      : "Comparing with AI Solution Architect…"}
                  </>
                ) : (
                  <>
                    Generate difference report
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              {error && (
                <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                  {canRun !== null && (
                    <button
                      type="button"
                      onClick={run}
                      disabled={!previous.file || !current.file || isProcessing}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Documents are analyzed in-session. Nothing is stored.
              </p>
            </div>
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

function FileSlot({
  label,
  hint,
  file,
  onFile,
  disabled,
  accent,
}: {
  label: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  disabled: boolean;
  accent?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = (f: File | null | undefined) => {
    setErr(null);
    if (!f) return;
    const name = f.name.toLowerCase();
    if (
      !name.endsWith(".pdf") &&
      !name.endsWith(".docx") &&
      !name.endsWith(".txt")
    ) {
      setErr("Only PDF, DOCX, or TXT files are supported.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setErr("File exceeds 15MB limit.");
      return;
    }
    onFile(f);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            accent
              ? "bg-accent/10 text-accent-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {accent ? "Current" : "Previous"}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-surface p-6 text-center transition-all",
          drag
            ? "border-accent bg-accent/5"
            : "border-border hover:border-foreground/30 hover:bg-muted",
          file && "cursor-default",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex w-full items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-foreground">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onFile(null);
              }}
              disabled={disabled}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              Drop PDF, DOCX or TXT
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              or click to choose
            </p>
          </>
        )}
      </label>

      {err && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {err}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Report view ------------------------------ */

function verdictBadge(v: DifferenceReport["overall_verdict"]) {
  const map = {
    improved: {
      cls: "bg-success/10 text-success border-success/30",
      icon: TrendingUp,
      label: "Improved",
    },
    regressed: {
      cls: "bg-destructive/10 text-destructive border-destructive/30",
      icon: TrendingDown,
      label: "Regressed",
    },
    neutral: {
      cls: "bg-muted text-muted-foreground border-border",
      icon: Minus,
      label: "Neutral",
    },
    mixed: {
      cls: "bg-accent/10 text-accent-foreground border-accent/30",
      icon: GitCompareArrows,
      label: "Mixed",
    },
  } as const;
  return map[v];
}

function directionStyle(d: DiffDirection) {
  switch (d) {
    case "added":
      return {
        cls: "bg-success/10 text-success border-success/30",
        icon: Plus,
        label: "Added",
      };
    case "removed":
      return {
        cls: "bg-destructive/10 text-destructive border-destructive/30",
        icon: Minus,
        label: "Removed",
      };
    case "changed":
      return {
        cls: "bg-accent/10 text-accent-foreground border-accent/30",
        icon: GitCompareArrows,
        label: "Changed",
      };
    default:
      return {
        cls: "bg-muted text-muted-foreground border-border",
        icon: CheckCircle2,
        label: "Unchanged",
      };
  }
}

function ReportView({
  data,
  onReset,
}: {
  data: {
    report: DifferenceReport;
    currentFilename: string;
    previousFilename: string;
  };
  onReset: () => void;
}) {
  const { report, currentFilename, previousFilename } = data;
  const v = verdictBadge(report.overall_verdict);
  const VIcon = v.icon;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <GitCompareArrows className="h-3 w-3 text-accent" />
          Difference report
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
            v.cls,
          )}
        >
          <VIcon className="h-3 w-3" />
          {v.label}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Compare different documents
        </button>
      </div>

      <h1 className="font-display text-3xl leading-tight text-foreground md:text-4xl">
        {report.headline}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1">
          <FileText className="h-3.5 w-3.5" />
          Previous:{" "}
          <span className="font-medium text-foreground">{previousFilename}</span>
        </span>
        <ArrowRight className="h-4 w-4" />
        <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1">
          <FileText className="h-3.5 w-3.5" />
          Current:{" "}
          <span className="font-medium text-foreground">{currentFilename}</span>
        </span>
      </div>

      {/* Readiness delta */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label="Previous readiness"
          value={report.readiness_delta.previous_score}
        />
        <KpiCard
          label="Current readiness"
          value={report.readiness_delta.current_score}
          accent
        />
        <KpiCard
          label="Delta"
          value={report.readiness_delta.delta}
          highlight={report.readiness_delta.delta.startsWith("-") ? "down" : "up"}
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {report.readiness_delta.explanation}
      </p>

      {/* Key shifts */}
      <Section title="Key shifts" icon={Sparkles}>
        {report.key_shifts.length === 0 ? (
          <Empty text="No material shifts detected." />
        ) : (
          <ul className="space-y-2">
            {report.key_shifts.map((s, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-border bg-card p-3 text-sm text-foreground shadow-panel"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Risks + requirements deltas */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListPanel
          title="New risks"
          icon={ShieldAlert}
          tone="destructive"
          items={report.new_risks}
        />
        <ListPanel
          title="Resolved risks"
          icon={CheckCircle2}
          tone="success"
          items={report.resolved_risks}
        />
        <ListPanel
          title="New requirements"
          icon={Plus}
          tone="accent"
          items={report.new_requirements}
        />
        <ListPanel
          title="Dropped requirements"
          icon={Minus}
          tone="muted"
          items={report.dropped_requirements}
        />
      </div>

      {/* Category diffs */}
      <Section title="Category comparison" icon={GitCompareArrows}>
        <div className="space-y-4">
          {report.categories.map((c) => (
            <CategoryBlock key={c.category} data={c} />
          ))}
        </div>
      </Section>

      {/* Next actions */}
      <Section title="Recommended next actions" icon={ArrowRight}>
        {report.recommended_next_actions.length === 0 ? (
          <Empty text="No follow-up actions." />
        ) : (
          <ol className="space-y-2">
            {report.recommended_next_actions.map((a, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-border bg-card p-3 text-sm text-foreground shadow-panel"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: "up" | "down";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 shadow-panel",
        accent
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-card",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl text-foreground",
          highlight === "up" && "text-success",
          highlight === "down" && "text-destructive",
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h2 className="font-display text-xl text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-surface px-3 py-4 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function ListPanel({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "destructive" | "success" | "accent" | "muted";
  items: string[];
}) {
  const toneCls =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : tone === "accent"
          ? "text-accent-foreground"
          : "text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", toneCls)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-foreground">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryBlock({ data }: { data: DiffCategory }) {
  const v = verdictBadge(data.net_change);
  const VIcon = v.icon;
  return (
    <div className="rounded-xl border border-border bg-card shadow-panel">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <h3 className="font-display text-lg text-foreground">{data.category}</h3>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            v.cls,
          )}
        >
          <VIcon className="h-3 w-3" />
          {v.label}
        </span>
        <p className="w-full text-sm text-muted-foreground md:ml-2 md:w-auto md:flex-1">
          {data.summary}
        </p>
      </div>
      {data.items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          No item-level differences in this category.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {data.items.map((it, i) => {
            const d = directionStyle(it.direction);
            const DIcon = d.icon;
            return (
              <div key={i} className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
                <div className="flex flex-col gap-1.5">
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      d.cls,
                    )}
                  >
                    <DIcon className="h-3 w-3" />
                    {d.label}
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {it.label}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="grid gap-2 md:grid-cols-2">
                    <DiffCell label="Previous" text={it.previous} />
                    <DiffCell label="Current" text={it.current} accent />
                  </div>
                  {it.impact && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-foreground">
                      <span className="font-semibold text-muted-foreground">
                        Impact:{" "}
                      </span>
                      {it.impact}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiffCell({
  label,
  text,
  accent,
}: {
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        accent
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-surface",
      )}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{text || "Not present"}</p>
    </div>
  );
}
