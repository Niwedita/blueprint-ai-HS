import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  filename: z.string().min(1).max(300),
  text: z.string().min(20).max(200_000),
});

export type Confidence = "low" | "medium" | "high";

export type RecommendationMeta = {
  why: string;
  evidence: string;
  business_impact: string;
  expected_roi: string;
  confidence: Confidence;
  alternative: string;
  why_not_another_option: string;
  risks: string;
  assumptions: string;
};

export type KpiCard = { value: string; explanation: string };

export type ExecutiveSnapshot = {
  readiness_score: KpiCard;
  recommended_edition: KpiCard;
  estimated_duration: KpiCard;
  estimated_consulting_effort: KpiCard;
  estimated_subscription_tier: KpiCard;
  overall_project_risk: KpiCard;
  estimated_workflows: KpiCard;
  estimated_custom_properties: KpiCard;
};

export type ExecutiveDashboard = {
  top_strengths: string[];
  key_risks: string[];
  top_recommendations: string[];
};

export type ReadinessDimension = {
  dimension:
    | "Data Quality"
    | "Process Maturity"
    | "Technology Readiness"
    | "Stakeholder Alignment"
    | "Change Readiness"
    | "Executive Sponsorship";
  score: number;
  rating: "low" | "medium" | "high";
  reasoning: string;
};

export type ConsultantConsideration = {
  area: string;
  consideration: string;
  trade_offs: string;
  when_to_revisit: string;
};

export type WorkshopQuestion = {
  priority: "high" | "medium" | "low";
  question: string;
};

export type NextDiscoveryWorkshop = {
  unanswered_questions: WorkshopQuestion[];
  decisions_required: string[];
  validation_activities: string[];
  planning_tasks: string[];
};

export type Blueprint = {
  executive_snapshot: ExecutiveSnapshot;
  executive_summary: string;
  company_information: {
    name: string;
    industry: string;
    size: string;
    region: string;
    business_model: string;
    notes: string;
  };
  discovery_facts: { category: string; fact: string; evidence: string }[];
  key_insights: { insight: string; based_on: string }[];
  business_goals: { title: string; description: string }[];
  current_challenges: { title: string; impact: string }[];
  recommended_hubs: ({
    name: string;
    tier: string;
    rationale: string;
  } & RecommendationMeta)[];
  edition_comparison: {
    recommended_edition: "Starter" | "Professional" | "Enterprise";
    summary: string;
    editions: {
      edition: "Starter" | "Professional" | "Enterprise";
      recommended: boolean;
      estimated_cost: string;
      features: string[];
      pros: string[];
      cons: string[];
      why_recommended: string;
      why_not_recommended: string;
    }[];
  };
  crm_blueprint: {
    objects: { name: string; purpose: string; key_properties: string[] }[];
    associations: string[];
  };
  pipelines: ({
    name: string;
    type: string;
    stages: string[];
  } & RecommendationMeta)[];
  property_recommendations: ({
    object: string;
    name: string;
    type: string;
    purpose: string;
  } & RecommendationMeta)[];
  automations: ({ name: string; trigger: string; outcome: string } & RecommendationMeta)[];
  integrations: ({ name: string; purpose: string; method: string } & RecommendationMeta)[];
  reporting_recommendations: ({
    name: string;
    audience: string;
    metrics: string[];
  } & RecommendationMeta)[];
  risks: { risk: string; severity: "low" | "medium" | "high"; mitigation: string }[];
  missing_discovery_information: {
    topic: string;
    why_it_matters: string;
    affected_recommendation: string;
  }[];
  implementation_roadmap: {
    phase: string;
    duration: string;
    objectives: string[];
  }[];
  readiness: {
    score: number;
    rating: "low" | "medium" | "high";
    reasoning: string;
  };
  executive_dashboard: ExecutiveDashboard;
  readiness_dimensions: ReadinessDimension[];
  consultant_considerations: ConsultantConsideration[];
  next_discovery_workshop: NextDiscoveryWorkshop;
};

const strObj = (props: Record<string, unknown>, required: string[]) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties: props,
});

const strArr = { type: "array", items: { type: "string" } } as const;

const kpiCard = strObj(
  { value: { type: "string" }, explanation: { type: "string" } },
  ["value", "explanation"],
);

const META_PROPS = {
  why: { type: "string" },
  evidence: { type: "string" },
  business_impact: { type: "string" },
  expected_roi: { type: "string" },
  confidence: { type: "string", enum: ["low", "medium", "high"] },
  alternative: { type: "string" },
  why_not_another_option: { type: "string" },
  risks: { type: "string" },
  assumptions: { type: "string" },
} as const;
const META_REQ = [
  "why",
  "evidence",
  "business_impact",
  "expected_roi",
  "confidence",
  "alternative",
  "why_not_another_option",
  "risks",
  "assumptions",
] as const;

const withMeta = (props: Record<string, unknown>, required: string[]) =>
  strObj({ ...props, ...META_PROPS }, [...required, ...META_REQ]);

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "executive_snapshot",
    "executive_summary",
    "company_information",
    "discovery_facts",
    "key_insights",
    "business_goals",
    "current_challenges",
    "recommended_hubs",
    "edition_comparison",
    "crm_blueprint",
    "pipelines",
    "property_recommendations",
    "automations",
    "integrations",
    "reporting_recommendations",
    "risks",
    "missing_discovery_information",
    "implementation_roadmap",
    "readiness",
    "executive_dashboard",
    "readiness_dimensions",
    "consultant_considerations",
    "next_discovery_workshop",
  ],
  properties: {
    executive_snapshot: strObj(
      {
        readiness_score: kpiCard,
        recommended_edition: kpiCard,
        estimated_duration: kpiCard,
        estimated_consulting_effort: kpiCard,
        estimated_subscription_tier: kpiCard,
        overall_project_risk: kpiCard,
        estimated_workflows: kpiCard,
        estimated_custom_properties: kpiCard,
      },
      [
        "readiness_score",
        "recommended_edition",
        "estimated_duration",
        "estimated_consulting_effort",
        "estimated_subscription_tier",
        "overall_project_risk",
        "estimated_workflows",
        "estimated_custom_properties",
      ],
    ),
    executive_summary: { type: "string" },
    company_information: strObj(
      {
        name: { type: "string" },
        industry: { type: "string" },
        size: { type: "string" },
        region: { type: "string" },
        business_model: { type: "string" },
        notes: { type: "string" },
      },
      ["name", "industry", "size", "region", "business_model", "notes"],
    ),
    discovery_facts: {
      type: "array",
      items: strObj(
        {
          category: { type: "string" },
          fact: { type: "string" },
          evidence: { type: "string" },
        },
        ["category", "fact", "evidence"],
      ),
    },
    key_insights: {
      type: "array",
      items: strObj(
        {
          insight: { type: "string" },
          based_on: { type: "string" },
        },
        ["insight", "based_on"],
      ),
    },
    business_goals: {
      type: "array",
      items: strObj(
        { title: { type: "string" }, description: { type: "string" } },
        ["title", "description"],
      ),
    },
    current_challenges: {
      type: "array",
      items: strObj(
        { title: { type: "string" }, impact: { type: "string" } },
        ["title", "impact"],
      ),
    },
    recommended_hubs: {
      type: "array",
      items: withMeta(
        {
          name: { type: "string" },
          tier: { type: "string" },
          rationale: { type: "string" },
        },
        ["name", "tier", "rationale"],
      ),
    },
    edition_comparison: strObj(
      {
        recommended_edition: {
          type: "string",
          enum: ["Starter", "Professional", "Enterprise"],
        },
        summary: { type: "string" },
        editions: {
          type: "array",
          items: strObj(
            {
              edition: {
                type: "string",
                enum: ["Starter", "Professional", "Enterprise"],
              },
              recommended: { type: "boolean" },
              estimated_cost: { type: "string" },
              features: strArr,
              pros: strArr,
              cons: strArr,
              why_recommended: { type: "string" },
              why_not_recommended: { type: "string" },
            },
            [
              "edition",
              "recommended",
              "estimated_cost",
              "features",
              "pros",
              "cons",
              "why_recommended",
              "why_not_recommended",
            ],
          ),
        },
      },
      ["recommended_edition", "summary", "editions"],
    ),
    crm_blueprint: strObj(
      {
        objects: {
          type: "array",
          items: strObj(
            {
              name: { type: "string" },
              purpose: { type: "string" },
              key_properties: strArr,
            },
            ["name", "purpose", "key_properties"],
          ),
        },
        associations: strArr,
      },
      ["objects", "associations"],
    ),
    pipelines: {
      type: "array",
      items: withMeta(
        {
          name: { type: "string" },
          type: { type: "string" },
          stages: strArr,
        },
        ["name", "type", "stages"],
      ),
    },
    property_recommendations: {
      type: "array",
      items: withMeta(
        {
          object: { type: "string" },
          name: { type: "string" },
          type: { type: "string" },
          purpose: { type: "string" },
        },
        ["object", "name", "type", "purpose"],
      ),
    },
    automations: {
      type: "array",
      items: withMeta(
        {
          name: { type: "string" },
          trigger: { type: "string" },
          outcome: { type: "string" },
        },
        ["name", "trigger", "outcome"],
      ),
    },
    integrations: {
      type: "array",
      items: withMeta(
        {
          name: { type: "string" },
          purpose: { type: "string" },
          method: { type: "string" },
        },
        ["name", "purpose", "method"],
      ),
    },
    reporting_recommendations: {
      type: "array",
      items: withMeta(
        {
          name: { type: "string" },
          audience: { type: "string" },
          metrics: strArr,
        },
        ["name", "audience", "metrics"],
      ),
    },
    risks: {
      type: "array",
      items: strObj(
        {
          risk: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          mitigation: { type: "string" },
        },
        ["risk", "severity", "mitigation"],
      ),
    },
    missing_discovery_information: {
      type: "array",
      items: strObj(
        {
          topic: { type: "string" },
          why_it_matters: { type: "string" },
          affected_recommendation: { type: "string" },
        },
        ["topic", "why_it_matters", "affected_recommendation"],
      ),
    },
    implementation_roadmap: {
      type: "array",
      items: strObj(
        {
          phase: { type: "string" },
          duration: { type: "string" },
          objectives: strArr,
        },
        ["phase", "duration", "objectives"],
      ),
    },
    readiness: strObj(
      {
        score: { type: "number" },
        rating: { type: "string", enum: ["low", "medium", "high"] },
        reasoning: { type: "string" },
      },
      ["score", "rating", "reasoning"],
    ),
    executive_dashboard: strObj(
      {
        top_strengths: strArr,
        key_risks: strArr,
        top_recommendations: strArr,
      },
      ["top_strengths", "key_risks", "top_recommendations"],
    ),
    readiness_dimensions: {
      type: "array",
      items: strObj(
        {
          dimension: {
            type: "string",
            enum: [
              "Data Quality",
              "Process Maturity",
              "Technology Readiness",
              "Stakeholder Alignment",
              "Change Readiness",
              "Executive Sponsorship",
            ],
          },
          score: { type: "number" },
          rating: { type: "string", enum: ["low", "medium", "high"] },
          reasoning: { type: "string" },
        },
        ["dimension", "score", "rating", "reasoning"],
      ),
    },
    consultant_considerations: {
      type: "array",
      items: strObj(
        {
          area: { type: "string" },
          consideration: { type: "string" },
          trade_offs: { type: "string" },
          when_to_revisit: { type: "string" },
        },
        ["area", "consideration", "trade_offs", "when_to_revisit"],
      ),
    },
    next_discovery_workshop: strObj(
      {
        unanswered_questions: {
          type: "array",
          items: strObj(
            {
              priority: { type: "string", enum: ["high", "medium", "low"] },
              question: { type: "string" },
            },
            ["priority", "question"],
          ),
        },
        decisions_required: strArr,
        validation_activities: strArr,
        planning_tasks: strArr,
      },
      [
        "unanswered_questions",
        "decisions_required",
        "validation_activities",
        "planning_tasks",
      ],
    ),
  },
} as const;

const SYSTEM_PROMPT = `You are a Senior HubSpot Solution Architect with 15+ years of consulting experience across Marketing Hub, Sales Hub, Service Hub, Operations Hub, Content Hub, and Commerce Hub. You have led HubSpot implementations for startups, mid-market and enterprise clients across B2B, B2C, SaaS, e-commerce and regulated industries. You produce presentation-ready implementation blueprints that a partner would deliver directly to an enterprise client executive.

CORE PRINCIPLES
1. Never hallucinate. Do not invent company names, headcount, tools, integrations, volumes, budgets, timelines, or requirements that are not present in the discovery document.
2. Separate three layers of knowledge:
   - FACTS: statements directly supported by the discovery text. Populate "discovery_facts" — each entry must include a short verbatim or near-verbatim "evidence" phrase from the document.
   - INSIGHTS: interpretations you draw from combinations of facts. Populate "key_insights" — each entry must reference which facts it is "based_on".
   - RECOMMENDATIONS: guidance grounded in HubSpot best practices, always tied back to a fact or insight.
3. Evidence rule: every recommendation's "why" field must cite a specific fact, quote, goal, pain, process or metric found in the discovery. Do not use generic marketing language.
4. If information required for a confident recommendation is missing, do NOT guess. Add an entry to "missing_discovery_information" describing the topic, why it matters, and which recommendation it would sharpen. It is better to lower confidence and flag the gap than to fabricate.
5. Edition rule — recommend the LOWEST HubSpot edition that satisfies the documented requirements. Only recommend Professional when specific documented requirements exceed Starter (e.g. workflow-based automation, custom reporting, sequences, teams). Only recommend Enterprise when the discovery explicitly documents an Enterprise-only need such as: custom objects at scale, business units, hierarchical teams, advanced permissions, SSO/SAML with user provisioning, sandbox environments, custom event reporting, predictive lead scoring, playbooks, forecasting, or comparable requirements. If Enterprise is not explicitly justified, do not recommend it.
6. Unknown scalar fields use "Not specified". Unknown lists stay empty and a corresponding entry is added to "missing_discovery_information".

OUTPUT SECTIONS
- executive_snapshot: eight KPI cards that give an executive a complete project summary in under 30 seconds. Each card has {value, explanation}. "value" is a short label (2–4 words / a number + unit). "explanation" is one sentence (max ~18 words) that a partner could read aloud to a client executive. Cards:
   • readiness_score → value like "78 / 100 – High"; explanation cites what drives the score.
   • recommended_edition → the highest edition among recommended_hubs (e.g. "Sales Hub Professional"); explanation names the primary driver.
   • estimated_duration → total elapsed calendar time (e.g. "10–14 weeks"); explanation cites the biggest time driver.
   • estimated_consulting_effort → billable consulting effort in person-days or person-weeks (e.g. "45–60 consulting days"); explanation names the effort driver.
   • estimated_subscription_tier → indicative annual HubSpot subscription tier / spend band (e.g. "Pro tier – mid-five figures / year"); explanation names the licensing driver.
   • overall_project_risk → "Low" | "Medium" | "High"; explanation names the top risk factor.
   • estimated_workflows → number or range of HubSpot Workflows (e.g. "~18 workflows"); explanation names the main automation driver.
   • estimated_custom_properties → number or range of custom properties across objects (e.g. "~35 custom properties"); explanation names the main data-model driver.
  All eight values must be internally consistent with the rest of the blueprint (readiness, recommended_hubs edition, roadmap durations, automations count, property_recommendations count, risks severity). If a value cannot be estimated confidently, use "Not specified" and add a missing_discovery_information entry.
- executive_summary: 3–5 sentences a partner could send to a client executive. Neutral, specific, evidence-based.
- company_information: extract name, industry, size, region, business model (B2B/B2C/marketplace/SaaS/etc.), notes. Use "Not specified" for anything not in the document.
- discovery_facts: the concrete facts the rest of the blueprint stands on. Categories such as "Company", "Team", "Process", "Systems", "Volume", "Goals", "Constraints". Each fact must include an "evidence" phrase drawn from the document.
- key_insights: interpretive observations that connect facts (e.g. "sales team is manually re-keying data from Stripe" based on two source facts). Include "based_on" pointing at the underlying facts.
- business_goals: outcome-driven, phrased from the client's perspective, tied to discovery.
- current_challenges: observed pains with concrete business impact.
- recommended_hubs: name Hub + edition (Free/Starter/Professional/Enterprise). Apply the edition rule strictly. Rationale must reference the documented driver.
- edition_comparison: side-by-side comparison of Starter, Professional and Enterprise for the primary Hub the client will run (usually Sales Hub, otherwise the highest-priority Hub from recommended_hubs). Include exactly one entry per edition in this order: Starter, Professional, Enterprise. For each edition provide:
   • features: 4–7 signature HubSpot capabilities available at that edition (e.g. Starter: simple automation, basic reporting, email marketing tools; Professional: workflows, custom reporting, sequences, teams, forecasting; Enterprise: custom objects at scale, business units, hierarchical teams, advanced permissions, SSO/SAML, sandboxes, custom event reporting, playbooks, predictive lead scoring).
   • pros: 2–4 concrete advantages FOR THIS CLIENT based on documented facts.
   • cons: 2–4 concrete limitations FOR THIS CLIENT based on documented facts.
   • estimated_cost: indicative annual list price band per Hub in USD (e.g. "$240–$1,200 / yr", "$10,800–$36,000 / yr", "$45,000+ / yr"). Prefix with "~" and note "list price, per Hub" to make the estimate explicit.
   • why_recommended: 1–2 sentences citing the specific documented drivers that make this edition a good fit. If this edition is NOT the recommended one, use "Not the recommended edition".
   • why_not_recommended: 1–2 sentences citing the specific documented drivers that make this edition a poor fit (overkill, missing capability, cost, complexity). If this edition IS the recommended one, use "Not applicable — this is the recommended edition".
   • recommended: exactly one edition has recommended=true and it must match edition_comparison.recommended_edition and be consistent with recommended_hubs. Enterprise may only be set as recommended when the discovery document explicitly documents an Enterprise-only need (custom objects at scale, business units, hierarchical teams, advanced permissions, SSO/SAML with user provisioning, sandboxes, custom event reporting, predictive lead scoring, playbooks, or comparable). Otherwise Enterprise.recommended MUST be false and its why_not_recommended MUST state that no Enterprise-only requirement was documented.
   summary: 1–2 sentences that state the recommended edition and the single strongest reason.
- crm_blueprint: standard HubSpot objects (Contacts, Companies, Deals, Tickets) plus custom objects only when documented needs justify them; include associations.
- pipelines: realistic HubSpot pipelines and stages driven by documented processes.
- property_recommendations: specific custom properties per object with HubSpot property type (single-line text / multi-line text / number / dropdown select / multiple checkboxes / date picker / datetime / calculated / score) and purpose.
- automations: HubSpot Workflows with trigger and business outcome.
- integrations: third-party systems named in the discovery, with method (native, iPaaS such as Zapier/Make/Workato, custom API, webhook, data sync). Do not invent integrations the client did not mention.
- reporting_recommendations: dashboards/reports with audience and key metrics.
- risks: implementation risks (data quality, adoption, migration, integration complexity, licensing, change management) with severity low/medium/high and mitigation.
- missing_discovery_information: gaps the consultant must clarify. Each item: topic, why_it_matters, affected_recommendation.
- implementation_roadmap: 3–5 phases (e.g. Foundation, Data Migration, Automation, Enablement, Go-Live & Optimize) with duration and objectives.
- readiness: 0–100 score reflecting clarity, completeness and complexity of the discovery. reasoning must explain the score in one short paragraph.

RECOMMENDATION META (required on every item inside recommended_hubs, pipelines, property_recommendations, automations, integrations, reporting_recommendations)
- why: 1–2 sentences citing the specific fact, goal, pain, process or metric from the discovery that drives this recommendation.
- evidence: a short verbatim or near-verbatim phrase from the discovery document that supports this recommendation. Quote the document. If nothing in the document supports it, write "No direct evidence in discovery — based on HubSpot best practice" and lower confidence to "low".
- business_impact: the concrete outcome the client will see (revenue, efficiency, retention, compliance, adoption). Prefer measurable phrasing when the discovery supports it.
- expected_roi: the tangible return the client should expect. Quantify when the discovery supports it (e.g. "~15% lift in SQL conversion", "~8 hours/week saved for RevOps", "payback in ~2 quarters"). If the discovery does not support a quantified ROI, describe the qualitative ROI and mark the assumption.
- confidence: "high" only when the discovery explicitly supports it; "medium" for reasonable inference from documented facts; "low" when it is HubSpot best-practice but discovery is thin — in that case also add a missing_discovery_information entry.
- alternative: a credible alternative option a senior consultant would consider (a different edition, workflow pattern, integration approach, report tool, property design, pipeline shape) and when to prefer it.
- why_not_another_option: 1–2 sentences explaining why the alternative above was NOT chosen for THIS client, citing the documented constraints, goals or scale that make the primary recommendation the better fit.
- risks: the specific risks or trade-offs of THIS recommendation (adoption, licensing cost, migration effort, vendor lock-in, complexity, data quality dependency, etc.). Not generic risks — the ones tied to this choice.
- assumptions: the assumptions this recommendation depends on so the consultant knows exactly what to validate with the client.

ADDITIONAL SECTIONS (all required)
- executive_dashboard: partner-ready summary content. Provide:
   • top_strengths: 3–5 short bullets (max ~14 words each) naming the strongest documented positives for a successful implementation.
   • key_risks: 3–5 short bullets naming the biggest documented risks, phrased as a client executive would hear them.
   • top_recommendations: exactly the 3 most important recommendations from the blueprint, each phrased in one sentence (action + rationale).
- readiness_dimensions: exactly 6 entries, one per dimension in this order: "Data Quality", "Process Maturity", "Technology Readiness", "Stakeholder Alignment", "Change Readiness", "Executive Sponsorship". Each entry has score (0–100), rating ("low" 0–44, "medium" 45–74, "high" 75–100), and reasoning: one short paragraph (~2 sentences) explaining how the score was determined and which discovery facts drove it. Scores must be consistent with the overall readiness.score (roughly its average).
- consultant_considerations: 4–8 items. Each item captures a senior-consultant judgement call the delivery team must weigh. Use area (short label like "Data migration", "Change management", "Automation scope"), consideration (the concern or trade-off), trade_offs (what is gained and what is given up), when_to_revisit (which future discovery information would change the recommendation). Focus on architectural trade-offs, assumptions, and situations where recommendations may shift.
- next_discovery_workshop: prioritized plan for the next client workshop before configuration begins. Provide:
   • unanswered_questions: 5–10 questions the consultant must ask, each with priority "high" | "medium" | "low". Order high first.
   • decisions_required: 3–6 concrete decisions the client must make (edition, integration approach, migration cutover, ownership model, etc.).
   • validation_activities: 3–6 activities to run to validate assumptions (data audit, process shadowing, tool inventory, sandbox test, stakeholder interviews).
   • planning_tasks: 3–6 planning tasks to complete before build (RACI, ownership matrix, cutover plan, communication plan, training plan, environment setup).

DEDUPLICATION
Do not repeat identical sentences across recommendation meta fields. If several recommendations depend on the same shared context (e.g. "NetSuite is the system of record"), state it once in the relevant recommendation and, on later ones, cite it briefly (e.g. "Same NetSuite constraint as above.") without repeating the full explanation. Evidence and confidence must still be present on every item.

TONE
Presentation-ready, client-facing English. Concise, specific, senior-consultant voice. No filler, no marketing fluff, no hedging language like "could potentially maybe". Prefer active voice.`;


export const generateBlueprint = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-terra",
        service_tier: "priority",
        reasoning_effort: "none",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze the following HubSpot discovery document titled "${data.filename}" and produce a complete implementation blueprint as structured JSON.\n\n---\n${data.text}\n---`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "hubspot_blueprint",
            strict: true,
            schema: jsonSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 429) {
        throw new Error("Rate limit reached. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Add credits in Lovable settings.");
      }
      throw new Error(`AI request failed [${response.status}]: ${body}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");

    const blueprint = JSON.parse(content) as Blueprint;
    return { blueprint, filename: data.filename };
  });
