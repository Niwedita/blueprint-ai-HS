// Normalize strings for safe export rendering.
//
// jsPDF's built-in Helvetica uses WinAnsi (Latin-1) encoding and cannot render
// smart quotes, em dashes, arrows, bullets, or any other non-Latin-1 glyph —
// they come out as "!'", "&", boxes, or mojibake. AI output frequently contains
// these characters plus stray control codes and mojibake from upstream encoding
// round-trips.
//
// normalizeText() rewrites the string into a WinAnsi-safe, printable form so
// every exported artifact (PDF, PPTX, on-screen chips, etc.) renders cleanly.

// Direct character replacements — smart punctuation, arrows, bullets, math, etc.
const REPLACEMENTS: Record<string, string> = {
  // Smart quotes / apostrophes
  "\u2018": "'", "\u2019": "'", "\u201A": "'", "\u201B": "'",
  "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u201F": '"',
  "\u2032": "'", "\u2033": '"', "\u2035": "'", "\u2036": '"',
  "\u00AB": '"', "\u00BB": '"', "\u2039": "'", "\u203A": "'",
  // Dashes / hyphens
  "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2013": "-",
  "\u2014": "-", "\u2015": "-", "\u2212": "-", "\uFE58": "-",
  "\uFE63": "-", "\uFF0D": "-",
  // Spaces
  "\u00A0": " ", "\u2000": " ", "\u2001": " ", "\u2002": " ",
  "\u2003": " ", "\u2004": " ", "\u2005": " ", "\u2006": " ",
  "\u2007": " ", "\u2008": " ", "\u2009": " ", "\u200A": " ",
  "\u202F": " ", "\u205F": " ", "\u3000": " ",
  // Zero-width / invisible
  "\u200B": "", "\u200C": "", "\u200D": "", "\u2060": "", "\uFEFF": "",
  "\u180E": "", "\u034F": "",
  // Bullets and list marks
  "\u2022": "-", "\u2023": "-", "\u25E6": "-", "\u2043": "-",
  "\u2219": "-", "\u25AA": "-", "\u25AB": "-", "\u25CF": "-",
  "\u25CB": "-", "\u25A0": "-", "\u25A1": "-", "\u25B8": ">",
  "\u25B6": ">", "\u25B7": ">", "\u25BA": ">", "\u2B25": "-",
  // Arrows -> ASCII
  "\u2190": "<-", "\u2192": "->", "\u2194": "<->",
  "\u21D0": "<=", "\u21D2": "=>", "\u21D4": "<=>",
  "\u2191": "^", "\u2193": "v", "\u21A6": "->", "\u27A4": ">",
  "\u27F6": "->", "\u27F5": "<-", "\u2794": "->",
  // Ellipsis / punctuation
  "\u2026": "...", "\u2027": ".", "\u00B7": "-",
  // Math / misc
  "\u00D7": "x", "\u00F7": "/", "\u2260": "!=", "\u2264": "<=", "\u2265": ">=",
  "\u2248": "~", "\u221E": "inf", "\u00B1": "+/-",
  "\u00B0": " deg", "\u2122": "(TM)", "\u00AE": "(R)", "\u00A9": "(c)",
  "\u2713": "v", "\u2714": "v", "\u2717": "x", "\u2718": "x",
  "\u2605": "*", "\u2606": "*", "\u2B50": "*", "\u2728": "*",
  // Fractions
  "\u00BC": "1/4", "\u00BD": "1/2", "\u00BE": "3/4",
  // Ligatures
  "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl", "\uFB03": "ffi", "\uFB04": "ffl",
};

// Common mojibake sequences produced when UTF-8 is decoded as Latin-1/CP1252.
const MOJIBAKE: Array<[RegExp, string]> = [
  [/â€™/g, "'"], [/â€˜/g, "'"],
  [/â€œ/g, '"'], [/â€\u009D/g, '"'], [/â€\u009d/g, '"'],
  [/â€“/g, "-"], [/â€”/g, "-"],
  [/â€¦/g, "..."],
  [/Â /g, " "], [/Â·/g, "-"], [/Â»/g, '"'], [/Â«/g, '"'],
  [/Ã©/g, "e"], [/Ã¨/g, "e"], [/Ã«/g, "e"], [/Ã ê/g, "a"],
  [/Ã¡/g, "a"], [/Ã /g, "a"], [/Ã¢/g, "a"],
  [/Ã­/g, "i"], [/Ã®/g, "i"], [/Ã¯/g, "i"],
  [/Ã³/g, "o"], [/Ã´/g, "o"], [/Ã¶/g, "o"],
  [/Ãº/g, "u"], [/Ã»/g, "u"], [/Ã¼/g, "u"],
  [/Ã±/g, "n"], [/Ã§/g, "c"],
  [/ï¿½/g, ""], [/\uFFFD/g, ""],
];

// Characters supported by WinAnsi / Latin-1 (jsPDF built-in fonts).
const WINANSI_KEEP = /[\u0020-\u007E\u00A0-\u00FF]/;

function stripControls(input: string): string {
  // Remove C0/C1 controls except tab (\t=\u0009) and newline (\n=\u000A).
  // Also drop DEL and format effectors.
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code === 0x09 || code === 0x0a) { out += ch; continue; }
    if (code < 0x20) continue;
    if (code === 0x7f) continue;
    if (code >= 0x80 && code <= 0x9f) continue;
    out += ch;
  }
  return out;
}

function applyMap(input: string): string {
  let out = "";
  for (const ch of input) {
    out += REPLACEMENTS[ch] ?? ch;
  }
  return out;
}

/**
 * Normalize a string for PDF/PPTX export and on-screen rendering.
 * - Strips invisible controls and BOM
 * - Repairs common UTF-8 mojibake
 * - Rewrites smart quotes, dashes, arrows, bullets, ellipses, math symbols
 * - Falls back to WinAnsi-safe characters so jsPDF Helvetica never emits boxes
 */
export function normalizeText(input: unknown): string {
  if (input === null || input === undefined) return "";
  let s = typeof input === "string" ? input : String(input);
  // Canonical Unicode composition
  try { s = s.normalize("NFKC"); } catch { /* older engines */ }
  // Repair mojibake before per-char replacement
  for (const [re, rep] of MOJIBAKE) s = s.replace(re, rep);
  // Direct character replacements
  s = applyMap(s);
  // Strip controls / BOM
  s = stripControls(s);
  // Any remaining non-WinAnsi character: replace with best-effort ASCII via NFKD, else drop
  let safe = "";
  for (const ch of s) {
    if (WINANSI_KEEP.test(ch)) { safe += ch; continue; }
    let decomposed = "";
    try { decomposed = ch.normalize("NFKD"); } catch { decomposed = ""; }
    let added = false;
    for (const d of decomposed) {
      if (WINANSI_KEEP.test(d)) { safe += d; added = true; }
    }
    if (!added) safe += ""; // drop unrenderable glyph rather than emit a box
  }
  // Collapse runs of whitespace introduced by strips
  safe = safe.replace(/[ \t]{2,}/g, " ").replace(/ ?\n ?/g, "\n");
  return safe;
}

/** Deep-normalize any value (strings inside arrays/objects) for safe rendering. */
export function normalizeDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return normalizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => normalizeDeep(v)) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeDeep(v);
    }
    return out as unknown as T;
  }
  return value;
}
