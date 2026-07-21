import pptxgen from "pptxgenjs";
import type { Blueprint } from "@/lib/blueprint.functions";
import { normalizeText, normalizeDeep } from "@/lib/normalizeText";

// Patch a pptx instance so every string added to any slide is normalized —
// strips control chars, repairs mojibake, and rewrites smart quotes/arrows/
// bullets to safe forms before it lands in the deck XML.
function installPptxNormalization(pptx: pptxgen) {
  const originalAddSlide = pptx.addSlide.bind(pptx);
  const normArg = (v: unknown): unknown => {
    if (typeof v === "string") return normalizeText(v);
    if (Array.isArray(v)) return v.map(normArg);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        out[k] = k === "text" || k === "hyperlink" || typeof val === "string"
          ? normArg(val)
          : normArg(val);
      }
      return out;
    }
    return v;
  };
  pptx.addSlide = ((opts?: unknown) => {
    const slide = originalAddSlide(opts as never);
    const origAddText = slide.addText.bind(slide);
    const s = slide as unknown as Record<string, unknown>;
    s.addText = ((...args: unknown[]) => {
      args[0] = normArg(args[0]);
      return (origAddText as unknown as (...a: unknown[]) => unknown)(...args);
    }) as unknown;
    return slide;
  }) as typeof pptx.addSlide;
}

// Brand palette
const NAVY = "0B1B33";
const INK = "1E2A44";
const SLATE = "5B6A85";
const MUTED = "8896AC";
const ACCENT = "2563EB"; // primary blue
const TEAL = "0EA5A4";
const BG_SOFT = "F4F6FB";
const WHITE = "FFFFFF";
const AMBER = "D97706";
const RED = "DC2626";
const GREEN = "059669";

const FONT_HEAD = "Calibri";
const FONT_BODY = "Calibri";

const NA = "Not Available";
const orNA = (v: string | null | undefined) => {
  const s = (v ?? "").toString().trim();
  return s.length ? s : NA;
};

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

function addFooter(slide: pptxgen.Slide, pageNum: number, total: number, companyName: string) {
  slide.addShape("rect", { x: 0, y: 7.15, w: 13.333, h: 0.35, fill: { color: NAVY } });
  slide.addText(`Blueprint AI  ·  ${companyName}`, {
    x: 0.4, y: 7.17, w: 8, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: WHITE,
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: 12.3, y: 7.17, w: 0.7, h: 0.3, align: "right",
    fontFace: FONT_BODY, fontSize: 9, color: WHITE,
  });
}

function addHeader(slide: pptxgen.Slide, kicker: string, title: string) {
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: ACCENT } });
  slide.addText(kicker.toUpperCase(), {
    x: 0.6, y: 0.35, w: 12, h: 0.3,
    fontFace: FONT_HEAD, fontSize: 10, bold: true, color: ACCENT, charSpacing: 3,
  });
  slide.addText(title, {
    x: 0.6, y: 0.65, w: 12, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 28, bold: true, color: NAVY,
  });
  slide.addShape("line", {
    x: 0.6, y: 1.42, w: 1.2, h: 0,
    line: { color: ACCENT, width: 2 },
  });
}

function bullets(items: string[]): pptxgen.TextProps[] {
  if (!items.length) return [{ text: NA, options: { italic: true, color: MUTED, fontSize: 14 } }];
  return items.map((t, i) => ({
    text: t,
    options: {
      bullet: { code: "25A0" },
      color: INK,
      fontSize: 14,
      paraSpaceAfter: 8,
      breakLine: i < items.length - 1,
    },
  }));
}

export function generateBlueprintPptx(filename: string, blueprintRaw: Blueprint) {
  const blueprint = normalizeDeep(blueprintRaw);
  const safeName = normalizeText(filename);
  const pptx = new pptxgen();
  installPptxNormalization(pptx);
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pptx.title = `${stripExt(safeName)} - Client Presentation`;
  pptx.company = "Blueprint AI";

  const company = orNA(blueprint.company_information?.name);
  const TOTAL = 10; // cover + 9 content

  // ---- Slide 1: Cover ----
  {
    const s = pptx.addSlide();
    s.background = { color: NAVY };
    s.addShape("rect", { x: 0, y: 0, w: 13.333, h: 0.5, fill: { color: ACCENT } });
    s.addText("BLUEPRINT AI  ·  HUBSPOT SOLUTION ARCHITECT", {
      x: 0.8, y: 1.2, w: 12, h: 0.4,
      fontFace: FONT_HEAD, fontSize: 12, bold: true, color: "9CB4E6", charSpacing: 4,
    });
    s.addText("Client Implementation Presentation", {
      x: 0.8, y: 1.7, w: 12, h: 1.2,
      fontFace: FONT_HEAD, fontSize: 44, bold: true, color: WHITE,
    });
    s.addText(company, {
      x: 0.8, y: 3.1, w: 12, h: 0.8,
      fontFace: FONT_HEAD, fontSize: 28, color: "CADCFC",
    });
    s.addShape("line", { x: 0.8, y: 4.1, w: 1.6, h: 0, line: { color: ACCENT, width: 3 } });

    const meta: [string, string][] = [
      ["Recommended Edition", orNA(blueprint.executive_snapshot?.recommended_edition?.value)],
      ["Estimated Duration", orNA(blueprint.executive_snapshot?.estimated_duration?.value)],
      ["Readiness Score", `${Math.round(blueprint.readiness?.score ?? 0)} / 100 · ${orNA(blueprint.readiness?.rating)}`],
      ["Generated", new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })],
    ];
    meta.forEach(([k, v], i) => {
      const y = 4.5 + i * 0.5;
      s.addText(k, { x: 0.8, y, w: 3.4, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: MUTED, bold: true });
      s.addText(v, { x: 4.3, y, w: 8, h: 0.4, fontFace: FONT_BODY, fontSize: 13, color: WHITE });
    });

    s.addText("Confidential · Prepared for client review", {
      x: 0.8, y: 6.9, w: 12, h: 0.3,
      fontFace: FONT_BODY, fontSize: 10, color: MUTED, italic: true,
    });
  }

  // ---- Slide 2: Executive Summary ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "01 · Executive Summary", "Strategic Overview");
    s.addText(orNA(blueprint.executive_summary), {
      x: 0.6, y: 1.7, w: 12.2, h: 3.4,
      fontFace: FONT_BODY, fontSize: 15, color: INK, paraSpaceAfter: 10,
    });

    // KPI strip
    const snap = blueprint.executive_snapshot;
    const kpis: [string, string][] = [
      ["Readiness", `${orNA(snap?.readiness_score?.value)}`],
      ["Edition", orNA(snap?.recommended_edition?.value)],
      ["Duration", orNA(snap?.estimated_duration?.value)],
      ["Risk", orNA(snap?.overall_project_risk?.value)],
    ];
    const cardW = 2.95;
    const gap = 0.15;
    kpis.forEach(([k, v], i) => {
      const x = 0.6 + i * (cardW + gap);
      s.addShape("roundRect", { x, y: 5.4, w: cardW, h: 1.35, fill: { color: BG_SOFT }, line: { color: BG_SOFT }, rectRadius: 0.08 });
      s.addText(k.toUpperCase(), { x: x + 0.15, y: 5.5, w: cardW - 0.3, h: 0.3, fontFace: FONT_BODY, fontSize: 9, bold: true, color: SLATE, charSpacing: 2 });
      s.addText(v, { x: x + 0.15, y: 5.8, w: cardW - 0.3, h: 0.85, fontFace: FONT_HEAD, fontSize: 18, bold: true, color: NAVY });
    });
    addFooter(s, 2, TOTAL, company);
  }

  // ---- Slide 3: Current State ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "02 · Current State", "Company Snapshot & Discovery");
    const info = blueprint.company_information;
    const rows: [string, string][] = [
      ["Company", orNA(info?.name)],
      ["Industry", orNA(info?.industry)],
      ["Size", orNA(info?.size)],
      ["Region", orNA(info?.region)],
      ["Business model", orNA(info?.business_model)],
    ];
    rows.forEach(([k, v], i) => {
      const y = 1.75 + i * 0.42;
      s.addText(k, { x: 0.6, y, w: 2.3, h: 0.35, fontFace: FONT_BODY, fontSize: 11, bold: true, color: SLATE });
      s.addText(v, { x: 2.9, y, w: 3.6, h: 0.35, fontFace: FONT_BODY, fontSize: 12, color: INK });
    });

    s.addText("Key discovery facts", {
      x: 6.9, y: 1.65, w: 6, h: 0.35,
      fontFace: FONT_HEAD, fontSize: 13, bold: true, color: NAVY,
    });
    const facts = (blueprint.discovery_facts ?? []).slice(0, 6).map((f) => `${f.category}: ${f.fact}`);
    s.addText(bullets(facts), { x: 6.9, y: 2.0, w: 6, h: 4.9, valign: "top" });
    addFooter(s, 3, TOTAL, company);
  }

  // ---- Slide 4: Challenges ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "03 · Challenges", "Current Pain Points");
    const items = (blueprint.current_challenges ?? []).slice(0, 6);
    if (!items.length) {
      s.addText(NA, { x: 0.6, y: 2, w: 12, h: 0.5, italic: true, color: MUTED, fontSize: 14 });
    } else {
      items.forEach((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 0.6 + col * 6.2;
        const y = 1.75 + row * 1.75;
        s.addShape("roundRect", { x, y, w: 6, h: 1.6, fill: { color: BG_SOFT }, line: { color: BG_SOFT }, rectRadius: 0.08 });
        s.addShape("rect", { x, y, w: 0.08, h: 1.6, fill: { color: RED }, line: { color: RED } });
        s.addText(orNA(c.title), { x: x + 0.25, y: y + 0.12, w: 5.6, h: 0.4, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: NAVY });
        s.addText(orNA(c.impact), { x: x + 0.25, y: y + 0.55, w: 5.6, h: 1.0, fontFace: FONT_BODY, fontSize: 11, color: INK, valign: "top" });
      });
    }
    addFooter(s, 4, TOTAL, company);
  }

  // ---- Slide 5: HubSpot Recommendation ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "04 · HubSpot Recommendation", "Recommended Hubs & Edition");

    const rec = orNA(blueprint.edition_comparison?.recommended_edition);
    s.addShape("roundRect", { x: 0.6, y: 1.7, w: 5.6, h: 1.4, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.08 });
    s.addText("RECOMMENDED EDITION", { x: 0.8, y: 1.82, w: 5.2, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: "9CB4E6", charSpacing: 2 });
    s.addText(rec, { x: 0.8, y: 2.15, w: 5.2, h: 0.7, fontFace: FONT_HEAD, fontSize: 28, bold: true, color: WHITE });
    s.addText(orNA(blueprint.edition_comparison?.summary), { x: 0.8, y: 2.75, w: 5.2, h: 0.4, fontFace: FONT_BODY, fontSize: 10, color: "CADCFC" });

    // Recommended hubs list
    s.addText("Recommended Hubs", { x: 6.5, y: 1.7, w: 6.3, h: 0.35, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: NAVY });
    const hubs = (blueprint.recommended_hubs ?? []).slice(0, 5).map(
      (h) => `${orNA(h.name)} — ${orNA(h.tier)}: ${orNA(h.rationale)}`,
    );
    s.addText(bullets(hubs), { x: 6.5, y: 2.05, w: 6.3, h: 3.0, valign: "top" });

    // Why this edition
    s.addText("Why this edition", { x: 0.6, y: 3.35, w: 5.6, h: 0.35, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: NAVY });
    const recEdition = blueprint.edition_comparison?.editions?.find((e) => e.recommended);
    const why = orNA(recEdition?.why_recommended);
    s.addText(why, { x: 0.6, y: 3.7, w: 5.6, h: 3.0, fontFace: FONT_BODY, fontSize: 11, color: INK, valign: "top" });
    addFooter(s, 5, TOTAL, company);
  }

  // ---- Slide 6: CRM Architecture ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "05 · CRM Architecture", "Objects, Properties & Associations");

    const objects = (blueprint.crm_blueprint?.objects ?? []).slice(0, 6);
    if (!objects.length) {
      s.addText(NA, { x: 0.6, y: 1.9, w: 12, h: 0.5, italic: true, color: MUTED, fontSize: 14 });
    } else {
      const cols = Math.min(3, objects.length);
      const cardW = (12.2 - (cols - 1) * 0.2) / cols;
      objects.forEach((o, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 0.6 + col * (cardW + 0.2);
        const y = 1.75 + row * 1.9;
        s.addShape("roundRect", { x, y, w: cardW, h: 1.75, fill: { color: BG_SOFT }, line: { color: BG_SOFT }, rectRadius: 0.08 });
        s.addShape("rect", { x, y, w: cardW, h: 0.06, fill: { color: TEAL }, line: { color: TEAL } });
        s.addText(orNA(o.name), { x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: 0.4, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: NAVY });
        s.addText(orNA(o.purpose), { x: x + 0.2, y: y + 0.55, w: cardW - 0.4, h: 0.5, fontFace: FONT_BODY, fontSize: 10, color: SLATE });
        const props = (o.key_properties ?? []).slice(0, 4).join(" · ") || NA;
        s.addText(props, { x: x + 0.2, y: y + 1.1, w: cardW - 0.4, h: 0.55, fontFace: FONT_BODY, fontSize: 10, color: INK, italic: true });
      });
    }

    const assoc = (blueprint.crm_blueprint?.associations ?? []).slice(0, 3).join("  ·  ") || NA;
    s.addText(`Associations: ${assoc}`, { x: 0.6, y: 6.55, w: 12.2, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: SLATE, italic: true });
    addFooter(s, 6, TOTAL, company);
  }

  // ---- Slide 7: Implementation Roadmap ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "06 · Implementation Roadmap", "Phased Delivery Plan");
    const phases = (blueprint.implementation_roadmap ?? []).slice(0, 4);
    if (!phases.length) {
      s.addText(NA, { x: 0.6, y: 2, w: 12, h: 0.5, italic: true, color: MUTED, fontSize: 14 });
    } else {
      const cols = phases.length;
      const cardW = (12.2 - (cols - 1) * 0.2) / cols;
      // timeline line
      s.addShape("line", { x: 0.6, y: 2.15, w: 12.2, h: 0, line: { color: ACCENT, width: 2 } });
      phases.forEach((p, i) => {
        const x = 0.6 + i * (cardW + 0.2);
        // node
        s.addShape("ellipse", { x: x + cardW / 2 - 0.15, y: 2.0, w: 0.3, h: 0.3, fill: { color: ACCENT }, line: { color: ACCENT } });
        s.addText(String(i + 1), { x: x + cardW / 2 - 0.15, y: 2.0, w: 0.3, h: 0.3, fontFace: FONT_HEAD, fontSize: 12, bold: true, color: WHITE, align: "center", valign: "middle" });

        const y = 2.55;
        s.addShape("roundRect", { x, y, w: cardW, h: 4.15, fill: { color: BG_SOFT }, line: { color: BG_SOFT }, rectRadius: 0.08 });
        s.addText(orNA(p.phase), { x: x + 0.2, y: y + 0.15, w: cardW - 0.4, h: 0.5, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: NAVY });
        s.addText(orNA(p.duration), { x: x + 0.2, y: y + 0.6, w: cardW - 0.4, h: 0.3, fontFace: FONT_BODY, fontSize: 10, color: ACCENT, bold: true });
        const objs = (p.objectives ?? []).slice(0, 5);
        s.addText(bullets(objs), { x: x + 0.2, y: y + 1.0, w: cardW - 0.4, h: 3.1, valign: "top", fontSize: 10 } as pptxgen.TextPropsOptions);
      });
    }
    addFooter(s, 7, TOTAL, company);
  }

  // ---- Slide 8: Risks ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "07 · Risks", "Implementation Risks & Mitigations");
    const risks = (blueprint.risks ?? []).slice(0, 5);
    if (!risks.length) {
      s.addText(NA, { x: 0.6, y: 2, w: 12, h: 0.5, italic: true, color: MUTED, fontSize: 14 });
    } else {
      // Header row
      s.addShape("rect", { x: 0.6, y: 1.7, w: 12.2, h: 0.4, fill: { color: NAVY }, line: { color: NAVY } });
      s.addText("SEVERITY", { x: 0.75, y: 1.75, w: 1.4, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: WHITE, charSpacing: 2 });
      s.addText("RISK", { x: 2.2, y: 1.75, w: 4.5, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: WHITE, charSpacing: 2 });
      s.addText("MITIGATION", { x: 6.8, y: 1.75, w: 6, h: 0.3, fontFace: FONT_BODY, fontSize: 10, bold: true, color: WHITE, charSpacing: 2 });

      risks.forEach((r, i) => {
        const y = 2.15 + i * 0.95;
        if (i % 2 === 1) {
          s.addShape("rect", { x: 0.6, y, w: 12.2, h: 0.95, fill: { color: BG_SOFT }, line: { color: BG_SOFT } });
        }
        const sev = r.severity ?? "medium";
        const sevColor = sev === "high" ? RED : sev === "medium" ? AMBER : GREEN;
        s.addShape("roundRect", { x: 0.75, y: y + 0.15, w: 1.2, h: 0.35, fill: { color: sevColor }, line: { color: sevColor }, rectRadius: 0.05 });
        s.addText(sev.toUpperCase(), { x: 0.75, y: y + 0.15, w: 1.2, h: 0.35, fontFace: FONT_BODY, fontSize: 10, bold: true, color: WHITE, align: "center", valign: "middle" });
        s.addText(orNA(r.risk), { x: 2.2, y: y + 0.08, w: 4.5, h: 0.85, fontFace: FONT_BODY, fontSize: 11, color: INK, valign: "top" });
        s.addText(orNA(r.mitigation), { x: 6.8, y: y + 0.08, w: 6, h: 0.85, fontFace: FONT_BODY, fontSize: 11, color: INK, valign: "top" });
      });
    }
    addFooter(s, 8, TOTAL, company);
  }

  // ---- Slide 9: Estimated Investment ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "08 · Estimated Investment", "Software, Services & Effort");
    const snap = blueprint.executive_snapshot;
    const cards: [string, string, string][] = [
      ["HubSpot Subscription", orNA(snap?.estimated_subscription_tier?.value), orNA(snap?.estimated_subscription_tier?.explanation)],
      ["Consulting Effort", orNA(snap?.estimated_consulting_effort?.value), orNA(snap?.estimated_consulting_effort?.explanation)],
      ["Implementation Duration", orNA(snap?.estimated_duration?.value), orNA(snap?.estimated_duration?.explanation)],
    ];
    cards.forEach(([k, v, exp], i) => {
      const x = 0.6 + i * 4.14;
      s.addShape("roundRect", { x, y: 1.85, w: 3.94, h: 2.6, fill: { color: BG_SOFT }, line: { color: BG_SOFT }, rectRadius: 0.1 });
      s.addShape("rect", { x, y: 1.85, w: 3.94, h: 0.06, fill: { color: ACCENT }, line: { color: ACCENT } });
      s.addText(k.toUpperCase(), { x: x + 0.25, y: 2.0, w: 3.5, h: 0.35, fontFace: FONT_BODY, fontSize: 10, bold: true, color: SLATE, charSpacing: 2 });
      s.addText(v, { x: x + 0.25, y: 2.35, w: 3.5, h: 0.9, fontFace: FONT_HEAD, fontSize: 22, bold: true, color: NAVY });
      s.addText(exp, { x: x + 0.25, y: 3.25, w: 3.5, h: 1.15, fontFace: FONT_BODY, fontSize: 10, color: INK, valign: "top" });
    });

    // Scope indicators
    s.addText("Scope indicators", { x: 0.6, y: 4.7, w: 12.2, h: 0.35, fontFace: FONT_HEAD, fontSize: 13, bold: true, color: NAVY });
    const scope: [string, string][] = [
      ["Workflows", orNA(snap?.estimated_workflows?.value)],
      ["Custom Properties", orNA(snap?.estimated_custom_properties?.value)],
      ["Recommended Edition", orNA(snap?.recommended_edition?.value)],
    ];
    scope.forEach(([k, v], i) => {
      const x = 0.6 + i * 4.14;
      s.addShape("roundRect", { x, y: 5.1, w: 3.94, h: 1.5, fill: { color: WHITE }, line: { color: "E4E9F2", width: 1 }, rectRadius: 0.08 });
      s.addText(k, { x: x + 0.2, y: 5.2, w: 3.6, h: 0.4, fontFace: FONT_BODY, fontSize: 11, color: SLATE });
      s.addText(v, { x: x + 0.2, y: 5.6, w: 3.6, h: 0.85, fontFace: FONT_HEAD, fontSize: 20, bold: true, color: ACCENT });
    });

    s.addText(
      "Figures are directional estimates derived from the discovery document. Final pricing requires HubSpot quoting and a detailed statement of work.",
      { x: 0.6, y: 6.75, w: 12.2, h: 0.3, fontFace: FONT_BODY, fontSize: 9, color: MUTED, italic: true },
    );
    addFooter(s, 9, TOTAL, company);
  }

  // ---- Slide 10: Next Steps ----
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    addHeader(s, "09 · Next Steps", "Recommended Path Forward");

    const steps: string[] = [
      "Review this blueprint with client stakeholders and confirm business goals.",
      "Close outstanding discovery items to firm up scope and pricing.",
      "Approve the recommended HubSpot edition and generate a HubSpot quote.",
      "Sign statement of work and schedule Phase 1 kickoff.",
      "Assign implementation team and confirm access to source systems.",
    ];

    // Missing discovery items become priority follow-ups when present
    const missing = (blueprint.missing_discovery_information ?? []).slice(0, 3).map(
      (m) => `Confirm: ${m.topic} — ${m.why_it_matters}`,
    );
    const finalSteps = [...missing, ...steps].slice(0, 6);

    finalSteps.forEach((t, i) => {
      const y = 1.8 + i * 0.8;
      s.addShape("ellipse", { x: 0.6, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: ACCENT }, line: { color: ACCENT } });
      s.addText(String(i + 1), { x: 0.6, y: y + 0.05, w: 0.5, h: 0.5, fontFace: FONT_HEAD, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
      s.addText(t, { x: 1.3, y: y + 0.05, w: 11.5, h: 0.6, fontFace: FONT_BODY, fontSize: 13, color: INK, valign: "middle" });
    });

    s.addShape("roundRect", { x: 0.6, y: 6.55, w: 12.2, h: 0.5, fill: { color: NAVY }, line: { color: NAVY }, rectRadius: 0.06 });
    s.addText("Prepared by Blueprint AI  ·  HubSpot Solution Architect", {
      x: 0.8, y: 6.55, w: 12, h: 0.5,
      fontFace: FONT_BODY, fontSize: 11, color: WHITE, valign: "middle",
    });
    addFooter(s, 10, TOTAL, company);
  }

  const safe = stripExt(safeName).replace(/[^a-z0-9-_ ]/gi, "_").slice(0, 60) || "blueprint";
  pptx.writeFile({ fileName: `${safe} - Client Presentation.pptx` });
}
