# GA Maintenance LogbookLM — Product Requirements (LLM-Ready)

## Purpose
A NotebookLM-style assistant for ingesting, normalizing, and analyzing aircraft maintenance logbooks (airframe, engine, propeller, appliance). The system enables owners, operators, and mechanics to share, search, and track compliance and predictive maintenance events.

---

## 1) Problem Statement
Aircraft maintenance logbooks contain critical regulatory information (inspections, repairs, AD compliance, modifications, component overhauls, sign-offs). These are often scattered across handwritten books, scanned pages, PDFs, and proprietary digital systems. Ensuring compliance (annual, 100-hr, IFR, ELT, ADs, SBs) and predicting upcoming requirements is difficult, especially when records are incomplete or siloed. Existing systems are closed or expensive, and do not provide natural language interaction.

This app helps ingest + normalize + verify + analyze + share maintenance log data with an LLM interface for interactive Q&A.

Non-legal note: The app is an assistant/organizer tool, not a certified system of record. Owners remain responsible for maintaining official logbooks and regulatory compliance.

---

## 2) Goals & Non-Goals

### Goals
- G1: Allow aircraft owners to upload and manage maintenance logs, with optional sharing for mechanics, operators, or inspectors.
- G2: Ingest scanned pages (OCR) and digital data sources (CSV/JSON/XML from CAMP, Flightdocs, Traxxall, etc.).
- G3: Normalize records into a canonical database schema capturing required FAA fields and metadata.
- G4: Provide compliance tracking (next due inspections, AD status, time-since overhaul) and predictive maintenance insights.
- G5: Enable natural language Q&A over the logbook corpus ("When is the next pitot-static check due?" "Show last three oil changes").
- G6: Export structured outputs (PDF summaries, CSV/JSON exports) for sharing or resale.
- G7: Preserve privacy and control (owners retain record control; granular sharing options).

### Non-Goals
- N1: Not initially a certified system of record (primary legal logbook replacement).
- N2: Not a full MRO work order management system.
- N3: Not an accounting or billing platform.

---

## 3) Personas
- **Owner/Operator (OO):** Needs consolidated digital access, compliance summaries, resale records.
- **Mechanic/IA (MX):** Wants to upload signed entries, query past maintenance, confirm compliance.
- **Fleet/Part 135 Operator (FO):** Needs predictive maintenance forecasts, compliance dashboards across multiple aircraft.
- **Prospective Buyer (PB):** Wants summarized logbook history and AD/SB compliance status.

---

## 4) Functional Requirements (FR)

### Ingestion & Extraction
- FR1: Upload scanned pages (JPG/PNG/TIFF/PDF) and digital exports (CSV/XLSX/JSON/XML).
- FR2: OCR pipeline tuned for handwriting, tabular entries, and stamps/signatures.
- FR3: Auto-map fields (date, tach/Hobbs, description, signature) with manual override and templates.

### Normalization
- FR4: Canonical schema for maintenance events: {date, aircraft, tach/hr, description, signatory, reference (AD/SB), type (inspection, repair, modification)}.
- FR5: Track component life: airframe, engine(s), propeller(s), appliances, and installed parts.
- FR6: Normalize signatory credentials (A&P, IA, repair station) and attach to events.

### Computation & Compliance
- FR7: Time-since and next-due calculations for required inspections (annual, 100-hr, progressive, ELT, IFR, transponder, VOR).
- FR8: AD/SB tracking: ingestion of FAA AD data, cross-linked to aircraft/engine/prop models.
- FR9: Predictive maintenance projections (based on hours, cycles, calendar intervals).
- FR10: Consistency checks: duplicate entries, impossible dates/times, missing signatures.

### Analysis & Q&A
- FR11: NL queries with grounded references ("Show me last three oil changes" → cites entry IDs/pages).
- FR12: Compliance queries ("What is overdue?" "Next annual due date?").
- FR13: Predictive queries ("When will engine TBO be reached at current utilization?").

### Export & Reporting
- FR14: PDF exports of compliance summaries, work history reports, resale packets.
- FR15: CSV/JSON exports of normalized records.
- FR16: Sharing controls: owner can grant read-only or edit access to mechanics/operators.

### Provenance & Audit
- FR17: Every record links back to original scan (source_ref).
- FR18: Version history of entries; audit trail of edits and imports.

### Manual Entry
- FR19: Allow users to manually add maintenance events without a scan (e.g., oil change). Required: {date, aircraft/component, tach or hobbs (if applicable), description, event type}. Optional: {parts used, quantities, WO#, cost, signatory, attachments (photos/invoices), references (AD/SB)}. Manual entries are tagged origin=MANUAL, can later be linked to uploaded evidence, and fully participate in compliance calculations.

---

## 5) Non-Functional Requirements (NFR)
- NFR1: Accuracy targets: > 99% OCR accuracy post-review; validated parsing for FAA-required fields.
- NFR2: Latency: scan ingestion feedback < 15s for typical page; Q&A < 5s average.
- NFR3: Security: encryption at rest/in transit; role-based access; owner controls sharing.
- NFR4: Availability: 99.9% uptime; cloud multi-tenant with tenant isolation.
- NFR5: Observability: logs for OCR quality, compliance calculation, query performance.

---

## 6) Canonical Data Model (LLM-friendly JSON Schemas)

### 6.0 How much schema belongs in the PRD?
- PRD scope: Define core entities, required fields for compliance, and relationships sufficient for planning and LLM grounding.
- Technical Spec/Architecture doc: Owns the complete schema/ERD, indexing strategy, migrations, and validation rules.
- Approach here: Provide key JSON stubs for LLMs and engineers, plus an entity checklist for the full ERD.

**Entity checklist for the full ERD (to be detailed in tech spec):**
- Aircraft, Engine, Propeller, Appliance/Component, PartCatalog, InstalledPart, Removal/Install Events
- MaintenanceEvent (typed: inspection, repair, alteration, AD compliance, SB compliance, lubrication, oil change, functional check, test)
- Signature/Signatory (person, certificate, IA, repair station #), Organization (owner/operator/shop)
- AD, SB, STC, ICA references; ComplianceLink (event ↔ reference)
- Counters: Tach, Hobbs, Cycles, Calendar; UtilizationSnapshot
- Attachments (scan page, photo, invoice), SourceRef (page, bbox)
- Access Control (ACLs): Users, Roles, Shares

---

## 7) Key Flows

### 7.1 Initial Ingest (New Aircraft)
1. Owner uploads scanned log pages or imports digital files.
2. OCR → detect tables/text → classify into MaintenanceEvent fields.
3. Human-in-the-loop review grid with source overlay.
4. Save to canonical database with source_ref links.

### 7.2 Incremental Ingest (Existing Aircraft)
1. User uploads additional pages or new digital exports.
2. System fingerprints pages (hash + visual similarity) and deduplicates against existing sources.
3. Event matcher merges or versions entries using heuristics: {date ± tolerance, tach/hobbs proximity, component, description similarity}.
4. Conflicts route to review UI (side-by-side diff). Accepted changes create a new event version.
5. Recompute compliance/predictions for affected components; update snapshots and notify watchers.

### 7.3 Compliance Flow
1. Normalize inspection/repair events.
2. Calculate next due dates/times (annual, 100-hr, ELT, IFR, etc.).
3. Cross-check against AD database.
4. Store snapshot; display compliance dashboard.

### 7.4 Q&A Flow
- Query → route to compliance engine or LLM semantic index.
- Return structured answer + citations (event IDs, page images).
- Example: "When is the next IFR altimeter check due?" → Computation engine → answer with due date, cite last event.

### 7.5 Manual Event Entry
1. User selects aircraft/component → opens Add Event form.
2. Enter required fields; optional parts list, attachments, costs.
3. Save creates a MANUAL event with provenance; triggers compliance recalculation.

---

## 8) Interfaces

### REST
- POST /v1/ingest
- GET /v1/events?aircraft_id=...
- POST /v1/events (create manual event)
- PATCH /v1/events/{event_id} (update/correct)
- POST /v1/events/{event_id}/attachments (add evidence)
- GET /v1/compliance?aircraft_id=...&as_of=...
- POST /v1/query → { question: string }
- POST /v1/exports

### Web App
- Owner dashboard: upload, search, compliance summary.
- Mechanic view: add entries, view history, restricted edit.
- Chat panel: NotebookLM-style Q&A with logs.
- Manual event form with validation and preview of impact on compliance.
