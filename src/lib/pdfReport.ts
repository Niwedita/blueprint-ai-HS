import { jsPDF } from "jspdf";
import type {
  Blueprint,
  ReadinessDimension,
  RecommendationMeta,
} from "@/lib/blueprint.functions";
import { normalizeText, normalizeDeep } from "@/lib/normalizeText";

// ------------------------------------------------------------------
// Text normalization for jsPDF's WinAnsi-only built-in Helvetica.
// ------------------------------------------------------------------
function installTextNormalization(doc: jsPDF) {
  const originalText = doc.text.bind(doc);
  const originalSplit = doc.splitTextToSize.bind(doc);
  const norm = (v: unknown): unknown => {
    if (typeof v === "string") return normalizeText(v);
    if (Array.isArray(v)) return v.map(norm);
    return v;
  };
  const d = doc as unknown as Record<string, unknown>;
  d.text = ((...args: unknown[]) => {
    args[0] = norm(args[0]);
    return (originalText as unknown as (...a: unknown[]) => unknown)(...args);
  }) as unknown;
  d.splitTextToSize = ((...args: unknown[]) => {
    args[0] = typeof args[0] === "string" ? normalizeText(args[0]) : args[0];
    return (originalSplit as unknown as (...a: unknown[]) => unknown)(...args);
  }) as unknown;
}

// ------------------------------------------------------------------
// Page geometry
// ------------------------------------------------------------------
const MARGIN = 54;
const PAGE_W = 612;
const PAGE_H = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 32;
const HEADER_Y = 34;

// ------------------------------------------------------------------
// Palette — kept from existing theme
// ------------------------------------------------------------------
const C = {
  ink: [15, 23, 42] as [number, number, number],
  subtle: [71, 85, 105] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  faint: [148, 163, 184] as [number, number, number],
  rule: [226, 232, 240] as [number, number, number],
  panel: [248, 250, 252] as [number, number, number],
  panelSoft: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  brand: [37, 99, 235] as [number, number, number],
  brandDark: [30, 58, 138] as [number, number, number],
  brandTint: [219, 234, 254] as [number, number, number],
  accent: [13, 148, 136] as [number, number, number],
  accentTint: [204, 251, 241] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  successTint: [220, 252, 231] as [number, number, number],
  warn: [202, 138, 4] as [number, number, number],
  warnTint: [254, 249, 195] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  dangerTint: [254, 226, 226] as [number, number, number],
};

type SectionKey =
  | "overview"
  | "client"
  | "evidence"
  | "strategy"
  | "architecture"
  | "process"
  | "risk"
  | "delivery"
  | "workshop"
  | "appendix";

const SECTION_COLOR: Record<SectionKey, [number, number, number]> = {
  overview: [37, 99, 235],
  client: [14, 165, 233],
  evidence: [139, 92, 246],
  strategy: [13, 148, 136],
  architecture: [16, 185, 129],
  process: [234, 88, 12],
  risk: [220, 38, 38],
  delivery: [202, 138, 4],
  workshop: [79, 70, 229],
  appendix: [100, 116, 139],
};

type TocEntry = { title: string; page: number; color: [number, number, number] };

type State = { y: number; page: number; section: SectionKey | "" };

export function generateBlueprintPdf(filename: string, blueprint: Blueprint) {
  const bp = normalizeDeep(blueprint);
  const safeName = normalizeText(filename);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  installTextNormalization(doc);
  const state: State = { y: MARGIN + 24, page: 1, section: "" };
  const toc: TocEntry[] = [];
  const generatedAt = new Date();
  const projectTitle = deriveTitle(bp, safeName);

  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

  // ---------------- Page chrome ----------------
  const drawPageChrome = () => {
    if (state.section) {
      const col = SECTION_COLOR[state.section] || C.brand;
      setFill(col);
      doc.rect(0, 0, PAGE_W, 4, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(C.muted);
    doc.text("BLUEPRINT AI", MARGIN, HEADER_Y);
    doc.setFont("helvetica", "normal");
    setColor(C.faint);
    doc.text(projectTitle.toUpperCase(), PAGE_W - MARGIN, HEADER_Y, {
      align: "right",
      maxWidth: CONTENT_W - 120,
    });
    setDraw(C.rule);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, HEADER_Y + 6, PAGE_W - MARGIN, HEADER_Y + 6);

    setDraw(C.rule);
    doc.line(MARGIN, FOOTER_Y - 10, PAGE_W - MARGIN, FOOTER_Y - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(C.muted);
    doc.text("Blueprint AI for HubSpot  |  Confidential", MARGIN, FOOTER_Y);
    doc.text(`Generated ${formatDate(generatedAt)}`, PAGE_W / 2, FOOTER_Y, {
      align: "center",
    });
    doc.text(`Page ${state.page}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
  };

  const newPage = () => {
    doc.addPage();
    state.page += 1;
    state.y = MARGIN + 24;
    drawPageChrome();
  };

  const ensureSpace = (needed: number) => {
    if (state.y + needed > FOOTER_Y - 24) newPage();
  };

  // ---------------- Typography primitives ----------------
  const text = (
    s: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: [number, number, number];
      leading?: number;
      indent?: number;
      x?: number;
      maxW?: number;
    } = {},
  ) => {
    const size = opts.size ?? 10;
    const leading = opts.leading ?? size * 1.45;
    const indent = opts.indent ?? 0;
    const startX = (opts.x ?? MARGIN) + indent;
    const maxW = opts.maxW ?? CONTENT_W - indent;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    setColor(opts.color ?? C.ink);
    const lines = doc.splitTextToSize(s, maxW);
    for (const line of lines) {
      ensureSpace(leading);
      doc.text(line, startX, state.y + size);
      state.y += leading;
    }
  };

  const sectionHeader = (
    sectionKey: SectionKey,
    eyebrow: string,
    title: string,
    icon?: IconShape,
  ) => {
    if (state.y > MARGIN + 60) newPage();
    state.section = sectionKey;
    const col = SECTION_COLOR[sectionKey];
    setFill(col);
    doc.rect(0, 0, PAGE_W, 4, "F");

    toc.push({ title, page: state.page, color: col });

    // Icon square
    if (icon) {
      drawIcon(doc, icon, MARGIN, state.y + 2, 16, col);
    }
    const eyebrowX = icon ? MARGIN + 24 : MARGIN;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setColor(col);
    doc.text(eyebrow.toUpperCase(), eyebrowX, state.y + 12);
    state.y += 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    setColor(C.ink);
    const titleLines = doc.splitTextToSize(title, CONTENT_W);
    for (const t of titleLines) {
      ensureSpace(26);
      doc.text(t, MARGIN, state.y + 20);
      state.y += 26;
    }

    setFill(col);
    doc.rect(MARGIN, state.y + 4, 40, 3, "F");
    state.y += 18;
  };

  const subheading = (t: string) => {
    ensureSpace(24);
    state.y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    setColor(C.ink);
    doc.text(t, MARGIN, state.y + 10);
    // small underline
    setFill(SECTION_COLOR[state.section as SectionKey] || C.brand);
    const tw = doc.getTextWidth(t);
    doc.rect(MARGIN, state.y + 14, Math.min(tw, 40), 1.5, "F");
    state.y += 20;
  };

  const divider = () => {
    ensureSpace(12);
    setDraw(C.rule);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, state.y + 6, PAGE_W - MARGIN, state.y + 6);
    state.y += 12;
  };

  // ---------------- Reusable content components ----------------

  /** A card with colored left rail. */
  const card = (opts: {
    title: string;
    subtitle?: string;
    body?: string;
    color?: [number, number, number];
    icon?: IconShape;
    padTop?: number;
  }) => {
    const railColor = opts.color ?? SECTION_COLOR[state.section as SectionKey] ?? C.brand;
    const padX = 14;
    const padY = 12;
    // measure body height
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const titleLines: string[] = doc.splitTextToSize(opts.title, CONTENT_W - padX * 2 - 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const subLines: string[] = opts.subtitle
      ? doc.splitTextToSize(opts.subtitle, CONTENT_W - padX * 2 - 4)
      : [];
    doc.setFontSize(9.5);
    const bodyLines: string[] = opts.body
      ? doc.splitTextToSize(opts.body, CONTENT_W - padX * 2 - 4)
      : [];
    const h =
      padY * 2 +
      titleLines.length * 14 +
      (subLines.length ? 4 + subLines.length * 12 : 0) +
      (bodyLines.length ? 6 + bodyLines.length * 13 : 0);

    ensureSpace(h + 8);
    const startY = state.y;
    // Panel
    setFill(C.white);
    setDraw(C.rule);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, startY, CONTENT_W, h, 5, 5, "FD");
    // Rail
    setFill(railColor);
    doc.rect(MARGIN, startY, 3, h, "F");
    // Icon
    let textX = MARGIN + padX;
    if (opts.icon) {
      drawIcon(doc, opts.icon, MARGIN + padX, startY + padY - 1, 12, railColor);
      textX += 18;
    }
    let y = startY + padY;
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setColor(C.ink);
    for (const l of titleLines) {
      doc.text(l, textX, y + 10);
      y += 14;
    }
    // Subtitle
    if (subLines.length) {
      y += 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      setColor(C.muted);
      for (const l of subLines) {
        doc.text(l, textX, y + 8);
        y += 12;
      }
    }
    // Body
    if (bodyLines.length) {
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      setColor(C.subtle);
      for (const l of bodyLines) {
        doc.text(l, textX, y + 9);
        y += 13;
      }
    }
    state.y = startY + h + 8;
  };

  /** Tinted callout box with an icon + title + bullet list. */
  const callout = (opts: {
    title: string;
    items: string[];
    color: [number, number, number];
    tint: [number, number, number];
    icon: IconShape;
  }) => {
    const padX = 14;
    const padY = 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lineH = 13;
    const wrapped: string[][] = opts.items.map((it) =>
      doc.splitTextToSize(it, CONTENT_W - padX * 2 - 14),
    );
    const bodyLines = wrapped.reduce((n, w) => n + w.length, 0);
    const h = padY * 2 + 18 + bodyLines * lineH + Math.max(0, opts.items.length - 1) * 4;
    ensureSpace(h + 8);
    const y0 = state.y;
    setFill(opts.tint);
    setDraw(opts.color);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y0, CONTENT_W, h, 5, 5, "FD");
    // Icon + title
    drawIcon(doc, opts.icon, MARGIN + padX, y0 + padY - 1, 12, opts.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    setColor(opts.color);
    doc.text(opts.title.toUpperCase(), MARGIN + padX + 18, y0 + padY + 9);
    let y = y0 + padY + 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setColor(C.ink);
    for (let i = 0; i < opts.items.length; i++) {
      const lines = wrapped[i];
      setFill(opts.color);
      doc.circle(MARGIN + padX + 3, y + 4, 1.6, "F");
      for (let j = 0; j < lines.length; j++) {
        doc.text(lines[j], MARGIN + padX + 12, y + 8);
        y += lineH;
      }
      y += 4;
    }
    state.y = y0 + h + 8;
  };

  const confidencePill = (level: string, x: number, y: number) => {
    const norm = (level || "").toLowerCase();
    const col =
      norm === "high" ? C.success : norm === "medium" ? C.warn : C.danger;
    const label = (level || "N/A").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const w = doc.getTextWidth(label) + 10;
    setFill(col);
    doc.roundedRect(x, y, w, 11, 2, 2, "F");
    setColor(C.white);
    doc.text(label, x + 5, y + 8);
    return w;
  };

  /** Compact "Consultant Reasoning" panel — deduped against seen sentences. */
  const seenPhrases = new Set<string>();
  const dedupePhrase = (s: string): string => {
    const trimmed = s.trim();
    if (!trimmed) return "";
    // Dedup on the first ~140 chars — enough to catch repeated evidence lines.
    const key = trimmed.toLowerCase().slice(0, 140);
    if (seenPhrases.has(key)) return "(see earlier note)";
    seenPhrases.add(key);
    return trimmed;
  };

  const reasoningPanel = (m: Partial<RecommendationMeta>) => {
    type Row = [string, string, [number, number, number]];
    const rows: Row[] = ([
      ["Why", dedupePhrase(m.why ?? ""), C.brand],
      ["Evidence", dedupePhrase(m.evidence ?? ""), C.accent],
      ["Business impact", dedupePhrase(m.business_impact ?? ""), C.success],
      ["Expected ROI", dedupePhrase(m.expected_roi ?? ""), C.success],
      ["Alternative", dedupePhrase(m.alternative ?? ""), C.muted],
      ["Why not that", dedupePhrase(m.why_not_another_option ?? ""), C.muted],
      ["Risks", dedupePhrase(m.risks ?? ""), C.danger],
      ["Assumptions", dedupePhrase(m.assumptions ?? ""), C.warn],
    ] as Row[]).filter((r) => r[1] && r[1] !== "");
    if (rows.length === 0) return;

    const padX = 12;
    const padY = 10;
    const labelW = 96;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const measured = rows.map(([, v]) =>
      doc.splitTextToSize(v, CONTENT_W - padX * 2 - labelW - 6),
    );
    const rowHs = measured.map((lines) => Math.max(14, lines.length * 12));
    const h = padY * 2 + rowHs.reduce((a, b) => a + b, 0);

    ensureSpace(h + 20);
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(C.muted);
    doc.text("CONSULTANT REASONING", MARGIN + padX, state.y + 8);
    // Confidence pill on right
    if (m.confidence) confidencePill(m.confidence, PAGE_W - MARGIN - 60, state.y);
    state.y += 14;

    const y0 = state.y;
    setFill(C.panel);
    setDraw(C.rule);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y0, CONTENT_W, h, 4, 4, "FD");

    let y = y0 + padY;
    for (let i = 0; i < rows.length; i++) {
      const [label, value, color] = rows[i];
      // dot
      setFill(color);
      doc.circle(MARGIN + padX + 2, y + 5, 1.8, "F");
      // label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setColor(C.ink);
      doc.text(label, MARGIN + padX + 10, y + 9);
      // value
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(C.subtle);
      const lines = measured[i];
      for (let j = 0; j < lines.length; j++) {
        doc.text(lines[j], MARGIN + padX + labelW, y + 9 + j * 12);
      }
      y += rowHs[i];
    }
    state.y = y0 + h + 10;
  };

  /** Consultant notes empty box — lined rows the consultant can annotate. */
  const consultantNotes = () => {
    const lines = 4;
    const lineGap = 16;
    const padY = 14;
    const h = padY * 2 + 14 + lines * lineGap;
    ensureSpace(h + 12);
    const y0 = state.y;
    setFill(C.panelSoft);
    setDraw(C.rule);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y0, CONTENT_W, h, 5, 5, "FD");
    // Icon + title
    drawIcon(doc, "pencil", MARGIN + 14, y0 + padY - 1, 11, C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setColor(C.muted);
    doc.text("CONSULTANT NOTES", MARGIN + 30, y0 + padY + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setColor(C.faint);
    doc.text(
      "Client decisions, workshop outcomes, follow-up observations",
      PAGE_W - MARGIN - 14,
      y0 + padY + 7,
      { align: "right" },
    );
    // Ruled lines
    setDraw(C.rule);
    doc.setLineWidth(0.4);
    for (let i = 0; i < lines; i++) {
      const ly = y0 + padY + 20 + i * lineGap;
      // dotted
      const step = 3;
      for (let x = MARGIN + 14; x < PAGE_W - MARGIN - 14; x += step) {
        doc.line(x, ly, x + 1, ly);
      }
    }
    state.y = y0 + h + 12;
  };

  // ============================================================
  // COVER + TOC
  // ============================================================
  drawCover(doc, projectTitle, bp, generatedAt);

  doc.addPage();
  const tocPageNumber = doc.getNumberOfPages();
  state.page = tocPageNumber;
  // (TOC content drawn at the very end once all page numbers are known.)

  // ============================================================
  // EXECUTIVE DASHBOARD
  // ============================================================
  newPage();
  sectionHeader("overview", "Section 01", "Executive Dashboard", "grid");

  // Big readiness bar + edition + timeline row
  drawReadinessBanner(doc, bp, state);

  // Summary paragraph
  text(bp.executive_summary || "Not available.", { size: 10.5, leading: 15 });
  state.y += 4;

  // Top strengths / key risks callouts (2 cols side-by-side using stacked style)
  const dash = bp.executive_dashboard;
  if (dash?.top_strengths?.length) {
    callout({
      title: "Top strengths",
      items: dash.top_strengths,
      color: C.success,
      tint: C.successTint,
      icon: "check",
    });
  }
  if (dash?.key_risks?.length) {
    callout({
      title: "Key risks",
      items: dash.key_risks,
      color: C.danger,
      tint: C.dangerTint,
      icon: "triangle",
    });
  }

  if (dash?.top_recommendations?.length) {
    subheading("Top 3 recommendations");
    dash.top_recommendations.slice(0, 3).forEach((r, i) => {
      card({
        title: `Recommendation ${i + 1}`,
        body: r,
        color: C.brand,
        icon: "star",
      });
    });
  }

  consultantNotes();

  // ============================================================
  // COMPANY INFORMATION
  // ============================================================
  const ci = bp.company_information;
  sectionHeader("client", "Section 02", "Company Information", "building");
  const infoPairs: [string, string, IconShape][] = [
    ["Company", ci.name || "Not specified", "building"],
    ["Industry", ci.industry || "Not specified", "grid"],
    ["Size", ci.size || "Not specified", "users"],
    ["Region", ci.region || "Not specified", "globe"],
    ["Business model", ci.business_model || "Not specified", "gear"],
  ];
  drawInfoGrid(doc, infoPairs, state);
  if (ci.notes) {
    text(ci.notes, { size: 10, color: C.subtle, leading: 14 });
  }
  consultantNotes();

  // ============================================================
  // DISCOVERY FACTS + INSIGHTS
  // ============================================================
  sectionHeader("evidence", "Section 03", "Discovery Facts", "quote");
  if (bp.discovery_facts.length === 0) {
    text("Not Available", { size: 10, color: C.muted });
  } else {
    bp.discovery_facts.forEach((f) =>
      card({
        title: f.fact,
        subtitle: `[${f.category}]`,
        body: `Evidence: "${f.evidence}"`,
        color: SECTION_COLOR.evidence,
        icon: "quote",
      }),
    );
  }
  consultantNotes();

  sectionHeader("evidence", "Section 04", "Key Insights", "bulb");
  if (bp.key_insights.length === 0) {
    text("Not Available", { size: 10, color: C.muted });
  } else {
    bp.key_insights.forEach((k) =>
      card({
        title: k.insight,
        body: `Based on: ${k.based_on}`,
        color: SECTION_COLOR.evidence,
        icon: "bulb",
      }),
    );
  }
  consultantNotes();

  // ============================================================
  // BUSINESS GOALS + CHALLENGES
  // ============================================================
  sectionHeader("strategy", "Section 05", "Business Goals", "target");
  if (bp.business_goals.length === 0)
    text("Not Available", { size: 10, color: C.muted });
  else
    bp.business_goals.forEach((g) =>
      card({ title: g.title, body: g.description, icon: "target" }),
    );
  consultantNotes();

  sectionHeader("strategy", "Section 06", "Current Challenges", "warning");
  if (bp.current_challenges.length === 0)
    text("Not Available", { size: 10, color: C.muted });
  else
    bp.current_challenges.forEach((c) =>
      card({ title: c.title, body: `Impact: ${c.impact}`, color: C.warn, icon: "warning" }),
    );
  consultantNotes();

  // ============================================================
  // HUBS + EDITION COMPARISON
  // ============================================================
  sectionHeader("strategy", "Section 07", "Recommended HubSpot Hubs", "stack");
  bp.recommended_hubs.forEach((h) => {
    card({ title: `${h.name} — ${h.tier}`, body: h.rationale, icon: "stack" });
    reasoningPanel(h);
  });
  consultantNotes();

  sectionHeader("strategy", "Section 08", "Compare HubSpot Editions", "grid");
  const ec = bp.edition_comparison;
  if (!ec || !ec.editions || ec.editions.length === 0) {
    text("Not Available", { size: 10, color: C.muted });
  } else {
    if (ec.summary) text(ec.summary, { size: 10, leading: 14 });
    state.y += 4;
    ec.editions.forEach((e) => {
      const railColor = e.recommended ? C.success : C.muted;
      const badge = e.recommended ? "  RECOMMENDED" : "";
      card({
        title: `${e.edition}${badge}`,
        subtitle: e.estimated_cost || "cost not specified",
        color: railColor,
        icon: e.recommended ? "star" : "grid",
      });
      if (e.features.length)
        text(`Features: ${e.features.join("; ")}`, {
          size: 9.5,
          color: C.subtle,
          leading: 13,
          indent: 12,
        });
      if (e.pros.length)
        text(`Pros: ${e.pros.join("; ")}`, {
          size: 9.5,
          color: C.success,
          leading: 13,
          indent: 12,
        });
      if (e.cons.length)
        text(`Cons: ${e.cons.join("; ")}`, {
          size: 9.5,
          color: C.danger,
          leading: 13,
          indent: 12,
        });
      text(
        e.recommended
          ? `Why recommended: ${e.why_recommended || "Not specified"}`
          : `Why not recommended: ${e.why_not_recommended || "Not specified"}`,
        { size: 9.5, color: C.subtle, leading: 13, indent: 12 },
      );
      state.y += 6;
    });
  }
  consultantNotes();

  // ============================================================
  // CRM BLUEPRINT
  // ============================================================
  sectionHeader("architecture", "Section 09", "CRM Blueprint", "database");
  bp.crm_blueprint.objects.forEach((o) =>
    card({
      title: o.name,
      subtitle: o.purpose,
      body: `Key properties: ${o.key_properties.join(", ")}`,
      icon: "database",
    }),
  );
  if (bp.crm_blueprint.associations.length) {
    subheading("Associations");
    bp.crm_blueprint.associations.forEach((a) =>
      text(`- ${a}`, { size: 9.5, color: C.subtle, leading: 13, indent: 8 }),
    );
  }
  consultantNotes();

  // ============================================================
  // PIPELINES
  // ============================================================
  sectionHeader("process", "Section 10", "Pipeline Recommendations", "flow");
  bp.pipelines.forEach((p) => {
    card({
      title: `${p.name} (${p.type})`,
      body: p.stages.join("  >  "),
      icon: "flow",
    });
    reasoningPanel(p);
  });
  consultantNotes();

  // ============================================================
  // PROPERTIES
  // ============================================================
  sectionHeader("architecture", "Section 11", "Property Recommendations", "tag");
  bp.property_recommendations.forEach((p) => {
    card({
      title: `${p.object}.${p.name}`,
      subtitle: p.type,
      body: p.purpose,
      icon: "tag",
    });
    reasoningPanel(p);
  });
  consultantNotes();

  // ============================================================
  // AUTOMATIONS
  // ============================================================
  sectionHeader("process", "Section 12", "Automation Opportunities", "bolt");
  bp.automations.forEach((a) => {
    card({
      title: a.name,
      subtitle: `Trigger: ${a.trigger}`,
      body: `Outcome: ${a.outcome}`,
      color: C.warn,
      icon: "bolt",
    });
    reasoningPanel(a);
  });
  consultantNotes();

  // ============================================================
  // INTEGRATIONS
  // ============================================================
  sectionHeader("architecture", "Section 13", "Recommended Integrations", "link");
  if (bp.integrations.length === 0) {
    text("No third-party integrations identified.", { size: 10, color: C.muted });
  } else {
    bp.integrations.forEach((it) => {
      card({
        title: it.name,
        subtitle: `Method: ${it.method}`,
        body: it.purpose,
        icon: "link",
      });
      reasoningPanel(it);
    });
  }
  consultantNotes();

  // ============================================================
  // REPORTING
  // ============================================================
  sectionHeader("process", "Section 14", "Reporting Recommendations", "chart");
  bp.reporting_recommendations.forEach((r) => {
    card({
      title: r.name,
      subtitle: `Audience: ${r.audience}`,
      body: `Metrics: ${r.metrics.join(", ")}`,
      icon: "chart",
    });
    reasoningPanel(r);
  });
  consultantNotes();

  // ============================================================
  // RISKS
  // ============================================================
  sectionHeader("risk", "Section 15", "Implementation Risks", "shield");
  if (bp.risks.length === 0) text("Not Available", { size: 10, color: C.muted });
  else
    bp.risks.forEach((r) => {
      const sevColor =
        r.severity === "high" ? C.danger : r.severity === "medium" ? C.warn : C.success;
      const sevTint =
        r.severity === "high"
          ? C.dangerTint
          : r.severity === "medium"
            ? C.warnTint
            : C.successTint;
      // pill
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const label = `${r.severity.toUpperCase()} RISK`;
      const pillW = doc.getTextWidth(label) + 12;
      setFill(sevTint);
      doc.roundedRect(MARGIN, state.y + 2, pillW, 12, 2, 2, "F");
      setColor(sevColor);
      doc.text(label, MARGIN + 6, state.y + 10.5);
      state.y += 18;
      card({
        title: r.risk,
        body: `Mitigation: ${r.mitigation}`,
        color: sevColor,
        icon: "shield",
      });
    });
  consultantNotes();

  // ============================================================
  // CONSULTANT CONSIDERATIONS
  // ============================================================
  sectionHeader("risk", "Section 16", "Consultant Considerations", "compass");
  const considerations = bp.consultant_considerations ?? [];
  if (considerations.length === 0) {
    text(
      "No additional trade-offs recorded. Recommendations are considered stable given current discovery.",
      { size: 10, color: C.muted },
    );
  } else {
    considerations.forEach((c) => {
      card({
        title: c.area,
        subtitle: c.consideration,
        color: SECTION_COLOR.risk,
        icon: "compass",
      });
      text(`Trade-offs: ${c.trade_offs}`, {
        size: 9.5,
        color: C.subtle,
        leading: 13,
        indent: 12,
      });
      text(`Revisit when: ${c.when_to_revisit}`, {
        size: 9.5,
        color: C.subtle,
        leading: 13,
        indent: 12,
      });
      state.y += 4;
    });
  }
  consultantNotes();

  // ============================================================
  // ROADMAP
  // ============================================================
  sectionHeader("delivery", "Section 17", "Implementation Roadmap", "flag");
  bp.implementation_roadmap.forEach((p, i) => {
    card({
      title: `Phase ${i + 1}: ${p.phase}`,
      subtitle: `Duration: ${p.duration}`,
      body: p.objectives.map((o) => `- ${o}`).join("\n"),
      color: SECTION_COLOR.delivery,
      icon: "flag",
    });
  });
  consultantNotes();

  // ============================================================
  // READINESS SCORECARD (dimensions)
  // ============================================================
  sectionHeader("overview", "Section 18", "Readiness Scorecard", "gauge");
  drawReadinessBanner(doc, bp, state);
  text(bp.readiness.reasoning || "Not available.", {
    size: 10,
    color: C.subtle,
    leading: 14,
  });
  state.y += 8;
  subheading("Category-wise readiness");
  const dims = bp.readiness_dimensions ?? [];
  if (dims.length === 0) {
    text("Not Available", { size: 10, color: C.muted });
  } else {
    dims.forEach((d) => drawDimensionRow(doc, d, state));
  }
  consultantNotes();

  // ============================================================
  // NEXT DISCOVERY WORKSHOP
  // ============================================================
  sectionHeader("workshop", "Section 19", "Recommended Next Discovery Workshop", "clipboard");
  const wk = bp.next_discovery_workshop;
  if (wk) {
    if (wk.unanswered_questions?.length) {
      subheading("Unanswered questions");
      wk.unanswered_questions.forEach((q) => drawPriorityQuestion(doc, q, state));
    }
    if (wk.decisions_required?.length) {
      subheading("Decisions required from the client");
      wk.decisions_required.forEach((d) =>
        card({ title: d, color: SECTION_COLOR.workshop, icon: "check" }),
      );
    }
    if (wk.validation_activities?.length) {
      subheading("Validation activities");
      wk.validation_activities.forEach((d) =>
        card({ title: d, color: C.accent, icon: "flow" }),
      );
    }
    if (wk.planning_tasks?.length) {
      subheading("Planning tasks before build");
      wk.planning_tasks.forEach((d) =>
        card({ title: d, color: SECTION_COLOR.delivery, icon: "flag" }),
      );
    }
  } else {
    text("Not Available", { size: 10, color: C.muted });
  }
  consultantNotes();

  // ============================================================
  // APPENDIX
  // ============================================================
  sectionHeader("appendix", "Appendix A", "Assumptions", "quote");
  const assumptions = collectAssumptions(bp);
  if (assumptions.length === 0)
    text("No explicit assumptions were recorded.", { size: 10, color: C.muted });
  else assumptions.forEach((a) => card({ title: a.source, body: a.text, icon: "quote" }));

  sectionHeader("appendix", "Appendix B", "Missing Discovery Information", "warning");
  if (bp.missing_discovery_information.length === 0) {
    text("Not Available", { size: 10, color: C.muted });
  } else {
    bp.missing_discovery_information.forEach((m, i) =>
      card({
        title: `${i + 1}. ${m.topic}`,
        subtitle: `Sharpens: ${m.affected_recommendation}`,
        body: `Why it matters: ${m.why_it_matters}`,
        color: C.warn,
        icon: "warning",
      }),
    );
  }

  // ============================================================
  // Fill TOC now that page numbers are known
  // ============================================================
  doc.setPage(tocPageNumber);
  drawTableOfContents(doc, toc, tocPageNumber);

  doc.save(`${stripExt(safeName)}-blueprint.pdf`);
}

// ==================================================================
// Cover Page
// ==================================================================
function drawCover(doc: jsPDF, title: string, bp: Blueprint, when: Date) {
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

  setFill(C.brandDark);
  doc.rect(0, 0, PAGE_W, 340, "F");
  setFill(C.brand);
  doc.rect(0, 340, PAGE_W, 6, "F");
  // decorative diagonal accents
  setFill([59, 130, 246]);
  doc.rect(PAGE_W - 180, 0, 40, 340, "F");
  setFill([96, 165, 250]);
  doc.rect(PAGE_W - 130, 0, 20, 340, "F");

  // Brand mark
  setFill([255, 255, 255]);
  doc.roundedRect(MARGIN, 70, 34, 34, 6, 6, "F");
  setColor(C.brandDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("B", MARGIN + 11, 94);

  setColor([255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Blueprint AI", MARGIN + 46, 88);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor([191, 219, 254]);
  doc.text("AI Solution Architect for HubSpot", MARGIN + 46, 102);

  // Eyebrow
  setColor([191, 219, 254]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("HUBSPOT IMPLEMENTATION BLUEPRINT", MARGIN, 180);

  // Title
  setColor([255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const titleLines = doc.splitTextToSize(title, CONTENT_W - 180);
  let ty = 210;
  titleLines.slice(0, 3).forEach((l: string) => {
    doc.text(l, MARGIN, ty);
    ty += 34;
  });

  // Prepared for
  setColor([191, 219, 254]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("PREPARED FOR", MARGIN, 305);
  setColor([255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(bp.company_information?.name || "Client", MARGIN, 322);

  // Body area — key facts
  const bodyTop = 390;
  setColor(C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("At a glance", MARGIN, bodyTop);
  setFill(C.brand);
  doc.rect(MARGIN, bodyTop + 6, 32, 2.5, "F");

  const facts: [string, string][] = [
    ["Industry", bp.company_information?.industry || "—"],
    ["Company size", bp.company_information?.size || "—"],
    ["Region", bp.company_information?.region || "—"],
    [
      "Recommended edition",
      bp.edition_comparison?.recommended_edition ||
        bp.executive_snapshot?.recommended_edition?.value ||
        "—",
    ],
    ["Estimated duration", bp.executive_snapshot?.estimated_duration?.value || "—"],
    [
      "Readiness",
      `${Math.round(bp.readiness?.score ?? 0)}/100 · ${(bp.readiness?.rating || "").toUpperCase()}`,
    ],
  ];

  const colW = (CONTENT_W - 12) / 2;
  facts.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (colW + 12);
    const y = bodyTop + 24 + row * 60;
    setFill(C.panel);
    doc.roundedRect(x, y, colW, 50, 5, 5, "F");
    doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, colW, 50, 5, 5, "S");
    // accent bar
    setFill(C.brand);
    doc.rect(x, y, 3, 50, "F");
    setColor(C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(f[0].toUpperCase(), x + 14, y + 18);
    setColor(C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const val = doc.splitTextToSize(f[1], colW - 26);
    doc.text(val[0], x + 14, y + 35);
  });

  // Confidential + date at bottom
  const bottomY = PAGE_H - 96;
  setFill(C.panel);
  doc.rect(0, bottomY, PAGE_W, 96, "F");
  setFill(C.brand);
  doc.rect(0, bottomY, PAGE_W, 3, "F");
  setColor(C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CONFIDENTIAL", MARGIN, bottomY + 30);
  doc.text("PREPARED BY", MARGIN + 200, bottomY + 30);
  doc.text("DATE", PAGE_W - MARGIN - 120, bottomY + 30);

  setColor(C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("For intended recipient only", MARGIN, bottomY + 48);
  doc.text("Blueprint AI", MARGIN + 200, bottomY + 48);
  doc.text(formatDate(when), PAGE_W - MARGIN - 120, bottomY + 48);
}

// ==================================================================
// Table of Contents
// ==================================================================
function drawTableOfContents(doc: jsPDF, toc: TocEntry[], pageNo: number) {
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

  setFill(C.brand);
  doc.rect(0, 0, PAGE_W, 4, "F");

  setColor(C.brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CONTENTS", MARGIN, MARGIN + 12);

  setColor(C.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("Table of Contents", MARGIN, MARGIN + 44);
  setFill(C.brand);
  doc.rect(MARGIN, MARGIN + 54, 40, 3, "F");

  let y = MARGIN + 92;
  doc.setFontSize(10.5);
  toc.forEach((e, i) => {
    if (y > FOOTER_Y - 40) return;
    setFill(e.color);
    doc.circle(MARGIN + 4, y - 3, 2.4, "F");
    setColor(C.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(String(i + 1).padStart(2, "0"), MARGIN + 14, y);
    setColor(C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(e.title, MARGIN + 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(C.faint);
    const titleW = doc.getTextWidth(e.title);
    const dotsStart = MARGIN + 40 + titleW + 6;
    const dotsEnd = PAGE_W - MARGIN - 24;
    if (dotsEnd > dotsStart) {
      const dotStr = ".".repeat(Math.max(3, Math.floor((dotsEnd - dotsStart) / 3)));
      doc.text(dotStr, dotsStart, y);
    }
    setColor(C.subtle);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(e.page), PAGE_W - MARGIN, y, { align: "right" });
    y += 22;
  });

  doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
  doc.line(MARGIN, FOOTER_Y - 10, PAGE_W - MARGIN, FOOTER_Y - 10);
  setColor(C.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Blueprint AI for HubSpot  |  Confidential", MARGIN, FOOTER_Y);
  doc.text(`Page ${pageNo}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
}

// ==================================================================
// Executive readiness banner (bar + label + edition + duration chips)
// ==================================================================
function drawReadinessBanner(doc: jsPDF, bp: Blueprint, state: State) {
  const score = Math.max(0, Math.min(100, Math.round(bp.readiness?.score ?? 0)));
  const rating = (bp.readiness?.rating || "medium") as "low" | "medium" | "high";
  const color =
    rating === "high" ? C.success : rating === "medium" ? C.warn : C.danger;

  const h = 118;
  const y0 = state.y;
  doc.setFillColor(C.panel[0], C.panel[1], C.panel[2]);
  doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y0, CONTENT_W, h, 6, 6, "FD");
  // Accent stripe
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(MARGIN, y0, 3, h, "F");

  // Eyebrow
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  doc.text("IMPLEMENTATION READINESS", MARGIN + 16, y0 + 18);

  // Big score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
  doc.text(`${score}`, MARGIN + 16, y0 + 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  doc.text("/100", MARGIN + 16 + doc.getTextWidth(`${score}`) + 4, y0 + 52);

  // Rating pill
  const ratingLabel = rating.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const pillW = doc.getTextWidth(ratingLabel) + 14;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(MARGIN + 16, y0 + 60, pillW, 14, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(ratingLabel, MARGIN + 23, y0 + 70);

  // Bar
  const barX = MARGIN + 130;
  const barY = y0 + 46;
  const barW = CONTENT_W - (barX - MARGIN) - 200;
  const barH = 10;
  doc.setFillColor(C.rule[0], C.rule[1], C.rule[2]);
  doc.roundedRect(barX, barY, barW, barH, 4, 4, "F");
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(barX, barY, Math.max(6, (barW * score) / 100), barH, 4, 4, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
  doc.text("Low", barX, barY + 22);
  doc.text("Medium", barX + barW / 2, barY + 22, { align: "center" });
  doc.text("High", barX + barW, barY + 22, { align: "right" });

  // Edition + Duration chips on right
  const rightX = PAGE_W - MARGIN - 180;
  const chip = (label: string, value: string, y: number) => {
    doc.setFillColor(C.white[0], C.white[1], C.white[2]);
    doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
    doc.roundedRect(rightX, y, 180, 30, 4, 4, "FD");
    doc.setFillColor(C.brand[0], C.brand[1], C.brand[2]);
    doc.rect(rightX, y, 2.5, 30, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(label, rightX + 10, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
    const v = doc.splitTextToSize(value, 160);
    doc.text(v[0], rightX + 10, y + 24);
  };
  chip(
    "RECOMMENDED EDITION",
    bp.edition_comparison?.recommended_edition ||
      bp.executive_snapshot?.recommended_edition?.value ||
      "—",
    y0 + 18,
  );
  chip(
    "ESTIMATED TIMELINE",
    bp.executive_snapshot?.estimated_duration?.value || "—",
    y0 + 58,
  );

  state.y = y0 + h + 14;
}

// ==================================================================
// Category-wise readiness row
// ==================================================================
function drawDimensionRow(doc: jsPDF, d: ReadinessDimension, state: State) {
  const score = Math.max(0, Math.min(100, Math.round(d.score ?? 0)));
  const rating = (d.rating || "medium") as "low" | "medium" | "high";
  const color =
    rating === "high" ? C.success : rating === "medium" ? C.warn : C.danger;

  const padX = 12;
  const padY = 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const reasoningLines: string[] = doc.splitTextToSize(
    d.reasoning || "",
    CONTENT_W - padX * 2,
  );
  const h = padY * 2 + 30 + reasoningLines.length * 12;
  if (state.y + h > FOOTER_Y - 24) {
    doc.addPage();
    state.page += 1;
    state.y = MARGIN + 24;
  }
  const y0 = state.y;
  doc.setFillColor(C.white[0], C.white[1], C.white[2]);
  doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y0, CONTENT_W, h, 5, 5, "FD");
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(MARGIN, y0, 3, h, "F");

  // Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
  doc.text(d.dimension, MARGIN + padX, y0 + padY + 8);
  // Score + rating
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(
    `${score}/100 · ${rating.toUpperCase()}`,
    PAGE_W - MARGIN - padX,
    y0 + padY + 8,
    { align: "right" },
  );
  // Bar
  const barX = MARGIN + padX;
  const barY = y0 + padY + 14;
  const barW = CONTENT_W - padX * 2;
  const barH = 5;
  doc.setFillColor(C.rule[0], C.rule[1], C.rule[2]);
  doc.roundedRect(barX, barY, barW, barH, 2, 2, "F");
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(barX, barY, Math.max(4, (barW * score) / 100), barH, 2, 2, "F");
  // Reasoning
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(C.subtle[0], C.subtle[1], C.subtle[2]);
  let ry = y0 + padY + 28;
  for (const l of reasoningLines) {
    doc.text(l, MARGIN + padX, ry);
    ry += 12;
  }
  state.y = y0 + h + 8;
}

// ==================================================================
// Prioritized question row (workshop)
// ==================================================================
function drawPriorityQuestion(
  doc: jsPDF,
  q: { priority: "high" | "medium" | "low"; question: string },
  state: State,
) {
  const color =
    q.priority === "high" ? C.danger : q.priority === "medium" ? C.warn : C.success;
  const tint =
    q.priority === "high"
      ? C.dangerTint
      : q.priority === "medium"
        ? C.warnTint
        : C.successTint;
  const padX = 12;
  const padY = 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines: string[] = doc.splitTextToSize(q.question, CONTENT_W - padX * 2 - 70);
  const h = padY * 2 + Math.max(14, lines.length * 13);
  if (state.y + h > FOOTER_Y - 24) {
    doc.addPage();
    state.page += 1;
    state.y = MARGIN + 24;
  }
  const y0 = state.y;
  doc.setFillColor(C.white[0], C.white[1], C.white[2]);
  doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y0, CONTENT_W, h, 5, 5, "FD");
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(MARGIN, y0, 3, h, "F");

  // Priority pill
  const label = q.priority.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  const pillW = doc.getTextWidth(label) + 12;
  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.roundedRect(MARGIN + padX, y0 + padY, pillW, 12, 2, 2, "F");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(label, MARGIN + padX + 6, y0 + padY + 8.5);

  // Question text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
  let ty = y0 + padY + 10;
  for (const l of lines) {
    doc.text(l, MARGIN + padX + pillW + 10, ty);
    ty += 13;
  }
  state.y = y0 + h + 6;
}

// ==================================================================
// Info grid (2 columns) for company info
// ==================================================================
function drawInfoGrid(
  doc: jsPDF,
  items: [string, string, IconShape][],
  state: State,
) {
  const colW = (CONTENT_W - 12) / 2;
  const cellH = 52;
  for (let i = 0; i < items.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (colW + 12);
    if (col === 0) {
      if (state.y + cellH > FOOTER_Y - 24) {
        doc.addPage();
        state.page += 1;
        state.y = MARGIN + 24;
      }
    }
    const y = state.y + row * (cellH + 8);
    doc.setFillColor(C.white[0], C.white[1], C.white[2]);
    doc.setDrawColor(C.rule[0], C.rule[1], C.rule[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, colW, cellH, 5, 5, "FD");
    doc.setFillColor(C.brand[0], C.brand[1], C.brand[2]);
    doc.rect(x, y, 3, cellH, "F");
    drawIcon(doc, items[i][2], x + 14, y + 12, 12, C.brand);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
    doc.text(items[i][0].toUpperCase(), x + 32, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
    const v = doc.splitTextToSize(items[i][1], colW - 46);
    doc.text(v[0], x + 32, y + 36);
  }
  const rows = Math.ceil(items.length / 2);
  state.y = state.y + rows * (cellH + 8) + 6;
}

// ==================================================================
// Icons — drawn as small geometric glyphs (WinAnsi-safe)
// ==================================================================
type IconShape =
  | "grid"
  | "check"
  | "triangle"
  | "star"
  | "quote"
  | "bulb"
  | "target"
  | "warning"
  | "stack"
  | "building"
  | "users"
  | "globe"
  | "gear"
  | "database"
  | "flow"
  | "tag"
  | "bolt"
  | "link"
  | "chart"
  | "shield"
  | "compass"
  | "flag"
  | "gauge"
  | "clipboard"
  | "pencil";

function drawIcon(
  doc: jsPDF,
  shape: IconShape,
  x: number,
  y: number,
  size: number,
  color: [number, number, number],
) {
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const s = size;
  setFill(color);
  setDraw(color);
  doc.setLineWidth(1.2);
  const cx = x + s / 2;
  const cy = y + s / 2;

  switch (shape) {
    case "check": {
      doc.circle(cx, cy, s / 2, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.4);
      doc.line(x + s * 0.28, y + s * 0.55, x + s * 0.45, y + s * 0.72);
      doc.line(x + s * 0.45, y + s * 0.72, x + s * 0.75, y + s * 0.32);
      break;
    }
    case "triangle": {
      // filled triangle (warning)
      doc.triangle(x, y + s, x + s, y + s, x + s / 2, y, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.2);
      doc.line(cx, y + s * 0.35, cx, y + s * 0.7);
      break;
    }
    case "warning": {
      doc.triangle(x, y + s, x + s, y + s, x + s / 2, y, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1.4);
      doc.line(cx, y + s * 0.3, cx, y + s * 0.7);
      break;
    }
    case "star": {
      doc.circle(cx, cy, s / 2, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      // simple asterisk star
      doc.line(cx, y + s * 0.2, cx, y + s * 0.8);
      doc.line(x + s * 0.2, cy, x + s * 0.8, cy);
      doc.line(x + s * 0.3, y + s * 0.3, x + s * 0.7, y + s * 0.7);
      doc.line(x + s * 0.7, y + s * 0.3, x + s * 0.3, y + s * 0.7);
      break;
    }
    case "grid": {
      const g = s / 2.4;
      doc.rect(x, y, g, g, "F");
      doc.rect(x + g + 1, y, g, g, "F");
      doc.rect(x, y + g + 1, g, g, "F");
      doc.rect(x + g + 1, y + g + 1, g, g, "F");
      break;
    }
    case "quote": {
      doc.circle(x + s * 0.28, y + s * 0.42, s * 0.18, "F");
      doc.circle(x + s * 0.68, y + s * 0.42, s * 0.18, "F");
      doc.rect(x + s * 0.15, y + s * 0.42, s * 0.24, s * 0.28, "F");
      doc.rect(x + s * 0.55, y + s * 0.42, s * 0.24, s * 0.28, "F");
      break;
    }
    case "bulb": {
      doc.circle(cx, y + s * 0.4, s * 0.32, "F");
      doc.rect(x + s * 0.38, y + s * 0.65, s * 0.24, s * 0.22, "F");
      break;
    }
    case "target": {
      doc.circle(cx, cy, s / 2, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, s * 0.32, "F");
      setFill(color);
      doc.circle(cx, cy, s * 0.14, "F");
      break;
    }
    case "stack": {
      doc.rect(x, y + s * 0.15, s, s * 0.2, "F");
      doc.rect(x, y + s * 0.4, s, s * 0.2, "F");
      doc.rect(x, y + s * 0.65, s, s * 0.2, "F");
      break;
    }
    case "building": {
      doc.rect(x + s * 0.15, y + s * 0.1, s * 0.7, s * 0.8, "F");
      doc.setFillColor(255, 255, 255);
      const w = s * 0.12;
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          doc.rect(x + s * 0.22 + c * (w + 2), y + s * 0.2 + r * (w + 2), w, w, "F");
      break;
    }
    case "users": {
      doc.circle(x + s * 0.35, y + s * 0.35, s * 0.18, "F");
      doc.circle(x + s * 0.7, y + s * 0.4, s * 0.14, "F");
      doc.rect(x + s * 0.12, y + s * 0.6, s * 0.5, s * 0.3, "F");
      doc.rect(x + s * 0.55, y + s * 0.62, s * 0.35, s * 0.28, "F");
      break;
    }
    case "globe": {
      doc.circle(cx, cy, s / 2, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.8);
      doc.line(x, cy, x + s, cy);
      doc.line(cx, y, cx, y + s);
      doc.ellipse(cx, cy, s * 0.22, s / 2 - 1, "S");
      break;
    }
    case "gear": {
      doc.circle(cx, cy, s * 0.42, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, s * 0.16, "F");
      break;
    }
    case "database": {
      doc.ellipse(cx, y + s * 0.2, s * 0.42, s * 0.12, "F");
      doc.rect(x + s * 0.08, y + s * 0.2, s * 0.84, s * 0.55, "F");
      doc.ellipse(cx, y + s * 0.75, s * 0.42, s * 0.12, "F");
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.6);
      doc.line(x + s * 0.08, y + s * 0.4, x + s * 0.92, y + s * 0.4);
      doc.line(x + s * 0.08, y + s * 0.55, x + s * 0.92, y + s * 0.55);
      break;
    }
    case "flow": {
      doc.circle(x + s * 0.2, cy, s * 0.15, "F");
      doc.circle(cx, cy, s * 0.15, "F");
      doc.circle(x + s * 0.8, cy, s * 0.15, "F");
      doc.setLineWidth(1);
      doc.line(x + s * 0.35, cy, x + s * 0.4, cy);
      doc.line(x + s * 0.6, cy, x + s * 0.65, cy);
      break;
    }
    case "tag": {
      doc.triangle(x + s * 0.05, cy, x + s * 0.35, y + s * 0.15, x + s * 0.35, y + s * 0.85, "F");
      doc.rect(x + s * 0.35, y + s * 0.15, s * 0.55, s * 0.7, "F");
      break;
    }
    case "bolt": {
      // Lightning bolt polygon
      const poly: [number, number][] = [
        [x + s * 0.55, y],
        [x + s * 0.2, y + s * 0.55],
        [x + s * 0.45, y + s * 0.55],
        [x + s * 0.35, y + s],
        [x + s * 0.8, y + s * 0.4],
        [x + s * 0.5, y + s * 0.4],
        [x + s * 0.65, y],
      ];
      polygon(doc, poly);
      break;
    }
    case "link": {
      doc.setLineWidth(1.6);
      setDraw(color);
      doc.circle(x + s * 0.3, cy, s * 0.22, "S");
      doc.circle(x + s * 0.7, cy, s * 0.22, "S");
      break;
    }
    case "chart": {
      doc.rect(x + s * 0.1, y + s * 0.6, s * 0.15, s * 0.3, "F");
      doc.rect(x + s * 0.35, y + s * 0.4, s * 0.15, s * 0.5, "F");
      doc.rect(x + s * 0.6, y + s * 0.2, s * 0.15, s * 0.7, "F");
      break;
    }
    case "shield": {
      const poly: [number, number][] = [
        [cx, y],
        [x + s, y + s * 0.2],
        [x + s * 0.85, y + s],
        [x + s * 0.15, y + s],
        [x, y + s * 0.2],
      ];
      polygon(doc, poly);
      break;
    }
    case "compass": {
      doc.circle(cx, cy, s / 2, "F");
      doc.setFillColor(255, 255, 255);
      doc.triangle(cx, y + s * 0.2, x + s * 0.35, cy, x + s * 0.65, cy, "F");
      setFill(color);
      doc.triangle(cx, y + s * 0.8, x + s * 0.35, cy, x + s * 0.65, cy, "F");
      break;
    }
    case "flag": {
      doc.rect(x + s * 0.15, y, s * 0.08, s, "F");
      doc.triangle(
        x + s * 0.23,
        y + s * 0.05,
        x + s * 0.9,
        y + s * 0.25,
        x + s * 0.23,
        y + s * 0.5,
        "F",
      );
      break;
    }
    case "gauge": {
      doc.setLineWidth(2);
      setDraw(color);
      // half arc
      const steps = 12;
      const r = s * 0.42;
      for (let i = 0; i < steps; i++) {
        const a1 = Math.PI + (Math.PI * i) / steps;
        const a2 = Math.PI + (Math.PI * (i + 1)) / steps;
        doc.line(
          cx + Math.cos(a1) * r,
          cy + Math.sin(a1) * r * 0.6,
          cx + Math.cos(a2) * r,
          cy + Math.sin(a2) * r * 0.6,
        );
      }
      // needle
      doc.setLineWidth(1.4);
      doc.line(cx, cy, cx + r * 0.7, cy - r * 0.3);
      setFill(color);
      doc.circle(cx, cy, s * 0.09, "F");
      break;
    }
    case "clipboard": {
      doc.rect(x + s * 0.15, y + s * 0.15, s * 0.7, s * 0.8, "F");
      doc.setFillColor(255, 255, 255);
      doc.rect(x + s * 0.3, y + s * 0.05, s * 0.4, s * 0.2, "F");
      setDraw(color);
      doc.setLineWidth(0.6);
      doc.line(x + s * 0.25, y + s * 0.4, x + s * 0.75, y + s * 0.4);
      doc.line(x + s * 0.25, y + s * 0.55, x + s * 0.75, y + s * 0.55);
      doc.line(x + s * 0.25, y + s * 0.7, x + s * 0.6, y + s * 0.7);
      break;
    }
    case "pencil": {
      // Diagonal pencil
      doc.setLineWidth(2);
      setDraw(color);
      doc.line(x + s * 0.15, y + s * 0.85, x + s * 0.85, y + s * 0.15);
      setFill(color);
      doc.triangle(
        x + s * 0.08,
        y + s * 0.92,
        x + s * 0.22,
        y + s * 0.78,
        x + s * 0.05,
        y + s * 0.75,
        "F",
      );
      break;
    }
    default: {
      doc.circle(cx, cy, s / 2, "F");
    }
  }
}

function polygon(doc: jsPDF, pts: [number, number][]) {
  if (pts.length < 3) return;
  const [x0, y0] = pts[0];
  const lines: [number, number, number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [nx, ny] = pts[i];
    lines.push([nx - px, ny - py, nx, ny]);
  }
  // Use jsPDF's lines API which supports fill
  const linesArr: [number, number][] = pts
    .slice(1)
    .map(([x, y], i) => [x - pts[i][0], y - pts[i][1]] as [number, number]);
  (doc as unknown as {
    lines: (
      lines: number[][],
      x: number,
      y: number,
      scale: [number, number],
      style: string,
      closed: boolean,
    ) => void;
  }).lines(linesArr, x0, y0, [1, 1], "F", true);
}

// ==================================================================
// Helpers
// ==================================================================
function collectAssumptions(bp: Blueprint) {
  const items: { source: string; text: string }[] = [];
  const push = (source: string, m?: Partial<RecommendationMeta>) => {
    if (m?.assumptions && m.assumptions.trim()) {
      items.push({ source, text: m.assumptions.trim() });
    }
  };
  bp.recommended_hubs.forEach((h) => push(`Hub · ${h.name}`, h));
  bp.pipelines.forEach((p) => push(`Pipeline · ${p.name}`, p));
  bp.property_recommendations.forEach((p) => push(`Property · ${p.object}.${p.name}`, p));
  bp.automations.forEach((a) => push(`Automation · ${a.name}`, a));
  bp.integrations.forEach((i) => push(`Integration · ${i.name}`, i));
  bp.reporting_recommendations.forEach((r) => push(`Report · ${r.name}`, r));
  return items;
}

function deriveTitle(bp: Blueprint, filename: string) {
  const co = bp.company_information?.name?.trim();
  if (co) return `${co} — HubSpot Implementation Blueprint`;
  return `${stripExt(filename)} — HubSpot Implementation Blueprint`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stripExt(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}
