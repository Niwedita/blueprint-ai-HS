export const SAMPLE_DISCOVERY_FILENAME = "Northwind-Logistics-Discovery.txt";

export const SAMPLE_DISCOVERY_TEXT = `NORTHWIND LOGISTICS — HUBSPOT DISCOVERY DOCUMENT
Prepared by: Acme Consulting  ·  Client: Northwind Logistics  ·  Date: Q2

1. COMPANY OVERVIEW
Northwind Logistics is a mid-market B2B freight and warehousing provider headquartered in Chicago, IL, with regional operations across the US Midwest and Ontario, Canada. Founded in 2004. Approximately 320 employees, of which ~45 are commercial (sales, account management, marketing). Annual revenue ~$78M. Primary buyer personas: Director of Supply Chain, VP of Operations, and Procurement Manager at manufacturers and mid-market retailers.

2. BUSINESS MODEL
Contract-based B2B services with two revenue streams:
  a) Long-term managed warehousing contracts (12–36 months, ~$150k–$1.2M ACV)
  b) Transactional freight brokerage (per-shipment, average deal size $2.4k)
About 70% of revenue comes from managed warehousing; 30% from brokerage. Sales cycle for managed warehousing averages 4–7 months and involves 3–5 stakeholders per deal.

3. CURRENT STATE
- CRM: Salesforce Essentials, poorly adopted. Reps mostly work out of spreadsheets and Outlook.
- Marketing: Mailchimp for newsletters, HubSpot Marketing Free trial abandoned last year.
- Support: Zendesk for existing customers, ~1,800 tickets/month.
- ERP: NetSuite (system of record for accounts, invoices, contracts).
- Website: WordPress with Gravity Forms; lead form submissions currently go to a shared inbox.
- Data quality is poor: ~40% of accounts have no assigned owner, no consistent industry field, and duplicate contacts are common.

4. GOALS (next 12 months)
- Consolidate sales, marketing and service on one platform.
- Increase marketing-sourced pipeline from ~8% to 25% of total pipeline.
- Reduce average sales cycle for managed warehousing by 20%.
- Give leadership a single view of pipeline, forecast, and customer health.
- Automate quote generation and contract renewal reminders.
- Improve NPS from current 32 to 50+ within 12 months.

5. PAIN POINTS
- Leadership has no reliable forecast; reps update Salesforce inconsistently.
- Marketing cannot prove ROI; no attribution between campaigns and closed revenue.
- Renewals are managed manually in a spreadsheet; three notable churn events in the last year were traced back to missed renewal outreach.
- Support tickets and account health are invisible to sales reps.
- Duplicate contacts across Salesforce, Mailchimp and Zendesk.

6. PROCESS DETAIL
Sales pipeline (managed warehousing):
  New Lead → Qualified → Discovery Call → Site Assessment → Proposal → Legal Review → Closed Won / Closed Lost
Sales pipeline (brokerage):
  Quote Requested → Quoted → Booked → Shipped → Invoiced
Renewals are tracked in an Excel file. Account managers own a book of ~40 accounts each.

7. INTEGRATION REQUIREMENTS
- NetSuite must remain the system of record for invoices and contracts. Two-way sync needed for accounts and closed-won deal amounts.
- Zendesk tickets must be visible on the contact and company record for sales reps.
- Website forms (Gravity Forms) must create/update contacts and trigger MQL routing.
- Slack notifications for high-value deal stage changes (>$250k).
- No requirement for custom-coded integrations beyond native/iPaaS connectors.

8. TEAM & ADOPTION
- 22 sales reps, 8 account managers, 6 marketers, 9 support agents.
- No dedicated HubSpot admin today. Willing to train one internal owner.
- Change management is a known risk — prior Salesforce rollout was considered a failure due to poor training.

9. REPORTING NEEDS
- Weekly pipeline and forecast for the CRO.
- Marketing attribution: campaign → MQL → SQL → Closed Won.
- Support: ticket volume, first response time, CSAT, and at-risk accounts.
- Renewals: 90/60/30-day upcoming renewals with account health.

10. BUDGET & TIMELINE
- Target go-live: within 6 months from kickoff.
- Software budget: up to ~$120k/year for the HubSpot subscription itself.
- Implementation services budget: separate, up to ~$180k one-time.
- Executive sponsor: COO. Weekly steering committee already committed.

11. EXPLICITLY OUT OF SCOPE
- Custom mobile app.
- Replacing NetSuite.
- Migrating historical support tickets older than 12 months.

12. OPEN QUESTIONS FROM CLIENT
- Do we need Sales Hub Enterprise, or is Professional enough for forecasting?
- How should we handle the two very different pipelines (managed vs brokerage)?
- What is the best way to model renewals — a separate pipeline, or a custom object?
- What integration approach is recommended for NetSuite: native, third-party iPaaS, or custom?
`;
