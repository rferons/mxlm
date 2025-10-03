
# Aircraft LogbookLM — Technical Specification (AWS Baseline, v1.0)

**Status:** Draft for iteration  
**Owner:** Ryan / Eng  
**Last updated:** 2025‑10‑03  

**Scope of this doc:** Full technical spec with database schemas, REST API endpoints, services/languages/hosting, LLM provider abstraction, FAA AD auto-update plan, file retention (forever), and 1 GB max upload.

---

## 0) Key Requirements & Decisions
- **Cloud**: Proceed on **AWS** for baseline implementation (serverless-first).
- **LLM Provider Flexibility**: Hot‑swappable adapters for OpenAI, Anthropic, Google Gemini, xAI Grok, and open‑source models via hosted gateways (Together/Fireworks) or private serverless inference when needed.
- **FAA AD Data**: Source directly from the FAA (DRS/official indexes). Implement **auto‑update** with daily polling/diff, hashing, and recompute triggers.
- **Retention & Uploads**: File **retention = forever** (no lifecycle deletion). **Max upload = 1 GB** via multipart direct‑to‑S3.
- **Citations & Safety**: All Q&A answers grounded with **page‑level citations + bbox**; show “insufficient evidence” on low confidence.

---

## 1) High‑Level Architecture (Serverless‑First on AWS)
- **Frontend**: Next.js (TypeScript) on **Vercel** (or AWS Amplify Hosting). Static assets cached via **CloudFront** if on AWS hosting.
- **Auth & Tenancy**: **Amazon Cognito** (Hosted UI or embedded), JWT validated by **API Gateway** Lambda authorizer. App‑level multi‑tenancy via `org_id` on all data rows.
- **API Layer**: **Amazon API Gateway (REST)** → **AWS Lambda** (TypeScript, Node 20) functions per bounded context.
- **Workflow Orchestration**: **AWS Step Functions (Express)** to run ingest/extraction pipelines.
- **Async Jobs**: **Amazon SQS** with DLQs; Lambda workers consume.
- **Object Storage**: **Amazon S3** for raw uploads, page tiles, derived artifacts (OCR JSON, thumbnails), exports. **SSE‑KMS** encryption + versioning.
- **Relational DB**: **Amazon Aurora Serverless v2 (PostgreSQL 15)** for normalized entities and transactions; encrypted; autoscaling.
- **Search & Vector**: Phase 1: **pgvector** in Aurora for embeddings; Phase 2 (optional): **OpenSearch Serverless** for hybrid BM25 + ANN if needed.
- **OCR/Layout**: Lambda containers (Python) using **Transformer OCR** (Donut/TrOCR/DocLayNet) with **Tesseract** fallback for hard scans.
- **LLM/RAG**: Provider‑agnostic **LLM Gateway** Lambda with adapters (OpenAI/Anthropic/Gemini/Grok/open‑source). Retrieval uses vector + keyword indices with strict citations.
- **Exports**: Lambda (Python) creates **PDF/DOCX** via WeasyPrint/docx‑templater.
- **Notifications**: **Amazon SES** (email) and **EventBridge Scheduler** for reminders (due items).
- **Observability**: CloudWatch Logs/Metrics/X‑Ray; pipeline analytics to S3 + Athena/QuickSight.
- **Security**: KMS everywhere, TLS in transit, audit logs, org‑scoped access checks on every request.

---

## 2) Services, Languages, and Hosting
- API Gateway Service (Lambda, TypeScript/Node 20)  
- Upload Service (Lambda, TypeScript)  
- Ingestion Service (Step Functions + Lambda, Python 3.11)  
- Extraction/Normalization (Lambda, Python)  
- Dedup/Match Service (Lambda, TypeScript/Python)  
- Compliance Engine (Lambda, TypeScript)  
- RAG/Q&A Service (Lambda, TypeScript/Python)  
- Share & Permissions Service (Lambda, TypeScript)  
- Export Service (Lambda, Python)  
- Admin/AD Importer (EventBridge + Lambda, Python/TS)  

_All functions are deployed with IaC (AWS CDK in TypeScript) and instrumented with X‑Ray._

---

## 3) Data Model (Aurora PostgreSQL 15, multi‑tenant)
(Contains schema definitions for `organizations`, `users`, `shares`, `aircraft`, `components`, `signatories`, `documents`, `document_pages`, `source_refs`, `maintenance_events`, `event_sources`, `part_catalog`, `event_parts`, `directives`, `directive_links`, `compliance_snapshots`, `due_items`, `review_queue`, `embeddings`, and `audit_log`.)

---

## 4) REST API (API Gateway → Lambda, JSON, RFC 7807 errors)
Covers endpoints for:
- Auth
- Uploads & Documents
- Events
- Parts & Signatories
- Directives & Compliance
- Review, Shares, Exports

---

## 5) Ingest & Extraction Pipeline (Step Functions, SQS, Lambda)
Stages: Start → Preprocess → OCR → Layout → Extraction → Dedup/Match → Review → Persist → Vectorization → Compliance Trigger → Finish.

---

## 6) LLM Provider Abstraction (Hot‑swappable)
Adapters for OpenAI, Anthropic, Gemini, Grok, open‑source. Routing heuristics by use case. Secrets managed in AWS Secrets Manager. Guardrails enforce mandatory citations.

---

## 7) Why AWS? (Comparison)
- Serverless maturity (Lambda + API Gateway + Step Functions)  
- Aurora Serverless v2 scaling vs Cloud SQL/Azure PG  
- S3 multipart for 1 GB uploads  
- Breadth for mixing Bedrock + 3rd party LLMs  

Alternatives: GCP (Document AI, Vertex), Azure (OpenAI, Cognitive Search). AWS chosen as most cohesive for ingest/file-heavy workloads.

---

## 8) FAA AD Data — Direct Source & Auto‑Update
- Source: FAA DRS (official AD PDFs/indices).  
- Storage: Raw in S3, metadata normalized in `directives`.  
- Daily EventBridge polling, hash-based diffs, recompute triggers for compliance.  
- Applicability matched against aircraft make/model/serial and components.  

---

## 9) Compliance Logic (Highlights)
- Annual, 100‑hr, ELT, IFR, XPDR, VOR, AD recurring, TBO.  
- Outputs to `due_items` and `compliance_snapshots`.

---

## 10) Security, Privacy, Governance
- KMS encryption, TLS, org‑scoped RLS, audit logs.  
- S3 indefinite retention with versioning.  

---

## 11) Observability, SLOs, and Cost
- Metrics: OCR confidence, extraction yield, API latency, token costs.  
- SLOs: ingest < 15s/page p80, Q&A < 5s p80.  
- Serverless pay-per-use posture.  

---

## 12) Testing & Evaluation
- Unit (regex, calculators), golden datasets, LLM eval harness, E2E flows.  

---

## 13) Implementation Plan (MVP)
- Week 1–2: DB migrations, uploads, ingest skeleton, LLM interface.  
- Week 3–5: OCR, Extraction MVP, events timeline, compliance basics.  
- Week 6–7: RAG/Q&A, exports, sharing, provider A/B tests.  
- Week 8: Hardening, docs.  

---

## 14) Example IAM (high‑level)
- Least-privilege policies for S3 prefixes, DB access via Secrets Manager, API Gateway roles, Step Functions task roles.

---

## 15) Appendix — Helper Views & Indexes
Includes SQL for `v_current_events`, `v_last_annual`, GIN and pgvector indexes.

---

