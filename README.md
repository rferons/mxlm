# MXLM - The easiest way to manage your aircraft logbooks

A NotebookLM-style assistant for ingesting, normalizing, and analyzing aircraft maintenance logbooks. This system enables aircraft owners, operators, and mechanics to share, search, and track compliance and predictive maintenance events through natural language interaction.

## 🎯 Purpose

Aircraft maintenance logbooks contain critical regulatory information (inspections, repairs, AD compliance, modifications, component overhauls, sign-offs) that are often scattered across handwritten books, scanned pages, PDFs, and proprietary digital systems. This application helps:

- **Ingest** scanned pages and digital data sources with OCR
- **Normalize** records into a canonical database schema
- **Track** compliance (annual, 100-hr, IFR, ELT, ADs, SBs)
- **Predict** upcoming maintenance requirements
- **Share** logbook data with mechanics, operators, and inspectors
- **Query** maintenance history through natural language Q&A

> **Legal Note**: This app is an assistant/organizer tool, not a certified system of record. Aircraft owners remain responsible for maintaining official logbooks and regulatory compliance.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js (TypeScript) on Vercel/AWS Amplify
- **Backend**: AWS Lambda (TypeScript/Node 20, Python 3.11)
- **Database**: Amazon Aurora Serverless v2 (PostgreSQL 15)
- **Storage**: Amazon S3 with SSE-KMS encryption
- **OCR**: Transformer OCR (Donut/TrOCR) with Tesseract fallback
- **LLM**: Provider-agnostic gateway (OpenAI, Anthropic, Gemini, Grok)
- **Infrastructure**: AWS CDK (TypeScript)

### Key Features
- **Multi-tenant** architecture with organization-scoped data
- **Hot-swappable** LLM providers for flexibility
- **FAA AD auto-update** with daily polling and compliance triggers
- **Forever retention** with 1GB max upload support
- **Grounded citations** with page-level references and bounding boxes
- **Manual entry** support for events without scans

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20.x LTS
- pnpm 10.18.0
- Python 3.11 with Poetry
- AWS CLI configured

### Installation

1. **Install dependencies:**
   ```bash
   # Install Node.js dependencies
   pnpm install
   
   # Install Python dependencies
   poetry install --no-interaction --no-ansi
   ```

2. **Set up environment:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables
   # See .env.example for required values
   ```

3. **Run development:**
   ```bash
   # Start development servers
   pnpm run dev
   
   # Run tests
   pnpm run verify
   ```

## 📁 Project Structure

```
├── apps/                    # Frontend applications
├── services/                # Backend Lambda functions
├── infrastructure/          # AWS CDK infrastructure code
├── packages/                # Shared TypeScript packages
├── python/                  # Python services and libraries
│   ├── src/mxlm/           # Python source code
│   └── tests/              # Python tests
└── tests/                   # End-to-end test suites
```

## 🔧 Development

### Available Scripts

- `pnpm run lint` - Run ESLint on TypeScript/JavaScript files
- `pnpm run test` - Run Vitest unit tests
- `pnpm run verify` - Run full verification (lint + test + pytest)
- `poetry run pytest` - Run Python tests

### Code Style

- **TypeScript**: ESLint + Prettier with strict mode enabled
- **Python**: PEP 8 + black-style formatting
- **Commits**: Follow conventional commit format

## 🎭 Personas

- **Owner/Operator (OO)**: Consolidated digital access, compliance summaries, resale records
- **Mechanic/IA (MX)**: Upload signed entries, query past maintenance, confirm compliance
- **Fleet/Part 135 Operator (FO)**: Predictive maintenance forecasts, compliance dashboards
- **Prospective Buyer (PB)**: Summarized logbook history and AD/SB compliance status

## 🔄 Key Workflows

### 1. Initial Ingest (New Aircraft)
1. Owner uploads scanned log pages or imports digital files
2. OCR → detect tables/text → classify into MaintenanceEvent fields
3. Human-in-the-loop review grid with source overlay
4. Save to canonical database with source_ref links

### 2. Compliance Tracking
1. Normalize inspection/repair events
2. Calculate next due dates/times (annual, 100-hr, ELT, IFR, etc.)
3. Cross-check against AD database
4. Store snapshot; display compliance dashboard

### 3. Natural Language Q&A
- Query → route to compliance engine or LLM semantic index
- Return structured answer + citations (event IDs, page images)
- Example: "When is the next IFR altimeter check due?" → Computation engine → answer with due date, cite last event

## 📊 Data Model

The system uses a normalized PostgreSQL schema with key entities:

- **Aircraft, Engine, Propeller, Appliance/Component**
- **MaintenanceEvent** (typed: inspection, repair, alteration, AD compliance, etc.)
- **Signature/Signatory** (person, certificate, IA, repair station)
- **AD, SB, STC, ICA references** with compliance links
- **Counters**: Tach, Hobbs, Cycles, Calendar
- **Attachments** (scan page, photo, invoice) with source references
- **Access Control**: Users, Roles, Shares

## 🔐 Security & Privacy

- **Encryption**: KMS encryption at rest and in transit
- **Access Control**: Role-based access with organization-scoped data
- **Audit**: Complete audit trail for all changes
- **Retention**: Indefinite file retention with versioning
- **Privacy**: Owners retain full control over data sharing

## 📈 Performance & SLOs

- **OCR Processing**: < 15s per page (p80)
- **Q&A Response**: < 5s average
- **Availability**: 99.9% uptime target
- **Accuracy**: > 99% OCR accuracy post-review

## 🧪 Testing

- **Unit Tests**: Vitest (TypeScript) + pytest (Python)
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full workflow validation
- **LLM Evaluation**: Golden dataset testing for Q&A accuracy

## 📚 Documentation

- [Product Requirements Document](./prd.md) - Detailed functional requirements
- [Technical Specification](./design_spec.md) - Architecture and implementation details
- [Agent Guidelines](./AGENTS.md) - Development workflow and conventions

## 🤝 Contributing

1. Follow the development workflow outlined in [AGENTS.md](./AGENTS.md)
2. Ensure all tests pass: `pnpm run verify`
3. Follow conventional commit format
4. Update documentation for any architectural changes

## 📄 License

[Add your license information here]

## 🆘 Support

For questions or issues, please refer to the documentation or create an issue in the repository.

---

**Status**: Development in progress  
**Version**: 0.1.0  
**Last Updated**: 2025-01-27
