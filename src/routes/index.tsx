import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  Cog,
  FileText,
  Flame,
  GaugeCircle,
  GitBranch,
  HelpCircle,
  Layers,
  Lightbulb,
  Loader2,
  Map,
  Plug,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Tags,
  Target,
} from "lucide-react";
import { AppFooter, AppHeader } from "@/components/app-shell";
import { UploadPanel } from "@/components/upload-panel";
import { BlueprintDashboard } from "@/components/blueprint-dashboard";

import { extractText } from "@/lib/parseDocument";
import { generateBlueprint, type Blueprint } from "@/lib/blueprint.functions";
import { generateBlueprintPdf } from "@/lib/pdfReport";
import { generateBlueprintPptx } from "@/lib/pptxReport";

import {
  SAMPLE_DISCOVERY_FILENAME,
  SAMPLE_DISCOVERY_TEXT,
} from "@/lib/sampleDiscovery";
import { cn } from "@/lib/utils";
import { recordBlueprint } from "@/lib/analytics-store";

type Status = "idle" | "parsing" | "analyzing" | "done" | "error";

interface Result {
  filename: string;
  blueprint: Blueprint;
  documentText: string;
  isSample?: boolean;
}

export const Route = createFileRoute("/")({
  component: HomePage,
});

const MODULES = [
  { icon: FileText, label: "Executive Summary" },
  { icon: Building2, label: "Company Information" },
  { icon: BookOpen, label: "Discovery Facts" },
  { icon: Lightbulb, label: "Key Insights" },
  { icon: Target, label: "Business Goals" },
  { icon: Flame, label: "Current Challenges" },
  { icon: Layers, label: "Hubs & Editions" },
  { icon: Boxes, label: "CRM Blueprint" },
  { icon: GitBranch, label: "Pipelines" },
  { icon: Tags, label: "Property Recommendations" },
  { icon: Cog, label: "Automation" },
  { icon: Plug, label: "Integrations" },
  { icon: BarChart3, label: "Reporting" },
  { icon: ShieldAlert, label: "Risks" },
  { icon: HelpCircle, label: "Discovery Gaps" },
  { icon: Map, label: "Implementation Roadmap" },
  { icon: GaugeCircle, label: "Readiness Score" },
];

function HomePage() {
  const generate = useServerFn(generateBlueprint);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const run = useCallback(
    async (file: File) => {
      setLastFile(file);
      setError(null);
      setStatus("parsing");
      try {
        const text = await extractText(file);
        if (text.trim().length < 40) {
          throw new Error(
            "The document appears empty or unreadable. Try a text-based PDF or DOCX.",
          );
        }
        setStatus("analyzing");
        const truncated = text.slice(0, 180_000);
        const res = await generate({
          data: { filename: file.name, text: truncated },
        });
        setResult({ ...res, documentText: truncated });
        recordBlueprint(res.filename, res.blueprint);
        setStatus("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setStatus("error");
      }
    },
    [generate],
  );

  const runSample = useCallback(async () => {
    setLastFile(null);
    setError(null);
    setStatus("analyzing");
    try {
      const res = await generate({
        data: {
          filename: SAMPLE_DISCOVERY_FILENAME,
          text: SAMPLE_DISCOVERY_TEXT,
        },
      });
      setResult({ ...res, documentText: SAMPLE_DISCOVERY_TEXT, isSample: true });
      recordBlueprint(res.filename, res.blueprint);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }, [generate]);

  const reset = () => {
    setResult(null);
    setLastFile(null);
    setStatus("idle");
    setError(null);
  };

  const retry = () => {
    if (lastFile) run(lastFile);
  };

  const downloadPdf = () => {
    if (!result) return;
    generateBlueprintPdf(result.filename, result.blueprint);
  };

  const downloadPptx = () => {
    if (!result) return;
    generateBlueprintPptx(result.filename, result.blueprint);
  };


  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        {result ? (
          <div className="mx-auto max-w-7xl px-6 py-10">
            {result.isSample && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                <Sparkles className="h-4 w-4 shrink-0 text-accent" />
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Sample project.</span>{" "}
                  <span className="text-muted-foreground">
                    Blueprint generated from a built-in demo discovery document
                    (Northwind Logistics). Upload your own document to generate a
                    real blueprint.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="ml-auto shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Upload your own
                </button>
              </div>
            )}
            <BlueprintDashboard
              filename={result.filename}
              blueprint={result.blueprint}
              documentText={result.documentText}
              onReset={reset}
              onExport={downloadPdf}
              onExportPptx={downloadPptx}

            />

          </div>
        ) : (
          <LandingUpload
            status={status}
            error={error}
            onSubmit={run}
            onTrySample={runSample}
            onRetry={lastFile ? retry : null}
            isProcessing={status === "parsing" || status === "analyzing"}
          />
        )}
      </main>
      <AppFooter />
    </div>
  );
}

function LandingUpload({
  status,
  error,
  onSubmit,
  onTrySample,
  onRetry,
  isProcessing,
}: {
  status: Status;
  error: string | null;
  onSubmit: (f: File) => void;
  onTrySample: () => void;
  onRetry: (() => void) | null;
  isProcessing: boolean;
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-background to-transparent" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 py-16 lg:grid-cols-5 lg:gap-16 lg:py-24">
          <div className="lg:col-span-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground shadow-panel">
              <Sparkles className="h-3 w-3 text-accent" />
              For HubSpot consultants and solution architects
            </div>
            <h1 className="mt-6 font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground md:text-5xl">
              From discovery document
              <br />
              to <span className="text-foreground/60">implementation blueprint</span>
              <br />
              in minutes.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Blueprint AI reads your client discovery, then produces a structured
              plan: recommended HubSpot Hubs, CRM data model, pipelines, workflows,
              risks and an implementation readiness score.
            </p>

            <div className="mt-8 flex items-center gap-6 text-xs uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                Structured JSON output
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                Under 30s target
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-foreground/40" />
                No data stored
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lift">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Upload discovery
                </h2>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Step 1 of 1
                </span>
              </div>
              <UploadPanel
                onSubmit={onSubmit}
                onTrySample={onTrySample}
                isProcessing={isProcessing}
              />

              {isProcessing && <ProcessingStrip status={status} />}
              {error && (
                <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                  {onRetry && !isProcessing && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-foreground md:text-4xl">
              Four steps from discovery notes to a client-ready plan.
            </h2>
          </div>
          <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              {
                n: "01",
                t: "Upload",
                d: "Drop your discovery PDF, DOCX or TXT. Nothing is persisted.",
              },
              {
                n: "02",
                t: "Parse",
                d: "The document is extracted and cleaned locally in your browser.",
              },
              {
                n: "03",
                t: "Analyze",
                d: "An AI Senior Solution Architect drafts the blueprint modules.",
              },
              {
                n: "04",
                t: "Review",
                d: "You get a dashboard with recommendations, risks and gaps.",
              },
            ].map((s) => (
              <li key={s.n}>
                <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
                <h3 className="mt-2 font-display text-2xl text-foreground">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="modules" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Blueprint modules
              </p>
              <h2 className="mt-2 font-display text-3xl leading-tight text-foreground md:text-4xl">
                Every deliverable a consultant assembles by hand — generated,
                consistent, reviewable.
              </h2>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
            {MODULES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-panel"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground/70">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ProcessingStrip({ status }: { status: Status }) {
  const steps = [
    { key: "parsing", label: "Parsing document" },
    { key: "analyzing", label: "Analyzing with AI Solution Architect" },
  ];
  return (
    <div className="mt-4 space-y-2 rounded-md border border-border bg-muted/40 p-3">
      {steps.map((s) => {
        const done =
          (s.key === "parsing" && status === "analyzing") || status === "done";
        const active = s.key === status;
        return (
          <div
            key={s.key}
            className={cn(
              "flex items-center gap-2 text-xs",
              done
                ? "text-muted-foreground"
                : active
                  ? "text-foreground"
                  : "text-muted-foreground/60",
            )}
          >
            {active ? (
              <Loader2 className="h-3 w-3 animate-spin text-accent" />
            ) : done ? (
              <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-success text-[8px] text-success-foreground">
                ✓
              </span>
            ) : (
              <span className="inline-flex h-3 w-3 rounded-full border border-border" />
            )}
            {s.label}
          </div>
        );
      })}
    </div>
  );
}
