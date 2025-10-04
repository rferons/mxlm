-- Create enum types
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MECHANIC', 'INSPECTOR', 'ADMIN', 'VIEWER');
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "ComponentType" AS ENUM ('AIRFRAME', 'ENGINE', 'PROPELLER', 'APPLIANCE', 'ACCESSORY', 'SUBCOMPONENT');
CREATE TYPE "MaintenanceEventType" AS ENUM ('INSPECTION', 'REPAIR', 'ALTERATION', 'AD_COMPLIANCE', 'SB_COMPLIANCE', 'LUBRICATION', 'OIL_CHANGE', 'FUNCTIONAL_CHECK', 'TEST', 'OTHER');
CREATE TYPE "MaintenanceEventOrigin" AS ENUM ('MANUAL', 'OCR', 'DIGITAL_IMPORT', 'SYSTEM');
CREATE TYPE "SignatoryCredentialType" AS ENUM ('AP', 'IA', 'REPAIR_STATION', 'OTHER');
CREATE TYPE "DirectiveType" AS ENUM ('AIRWORTHINESS_DIRECTIVE', 'SERVICE_BULLETIN', 'SERVICE_LETTER', 'STC', 'ICA');
CREATE TYPE "DirectiveStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'RESCINDED');
CREATE TYPE "DocumentKind" AS ENUM ('UPLOAD', 'EXPORT', 'ATTACHMENT');
CREATE TYPE "DocumentStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "EmbeddingScope" AS ENUM ('DOCUMENT', 'DOCUMENT_PAGE', 'MAINTENANCE_EVENT', 'DIRECTIVE', 'COMPLIANCE_SNAPSHOT');
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'ACCESSED', 'IMPORTED', 'EXPORT_TRIGGERED');
CREATE TYPE "AuditEntityType" AS ENUM ('ORGANIZATION', 'USER', 'AIRCRAFT', 'COMPONENT', 'MAINTENANCE_EVENT', 'DIRECTIVE', 'DOCUMENT', 'COMPLIANCE_SNAPSHOT', 'SHARE');

-- Organizations
CREATE TABLE "Organization" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Organization_createdAt_idx" ON "Organization" ("createdAt");

-- Users
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "inviteToken" TEXT UNIQUE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP WITH TIME ZONE,
    CONSTRAINT "User_orgId_email_unique" UNIQUE ("orgId", "email"),
    CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX "User_orgId_role_idx" ON "User" ("orgId", "role");

-- Aircraft
CREATE TABLE "Aircraft" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "tailNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT,
    "year" INTEGER,
    "timezone" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Aircraft_orgId_tailNumber_unique" UNIQUE ("orgId", "tailNumber"),
    CONSTRAINT "Aircraft_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX "Aircraft_orgId_make_model_idx" ON "Aircraft" ("orgId", "make", "model");

-- Components
CREATE TABLE "Component" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "parentComponentId" TEXT,
    "name" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "installedAt" TIMESTAMP WITH TIME ZONE,
    "removedAt" TIMESTAMP WITH TIME ZONE,
    "totalHours" DECIMAL(10,2),
    "totalCycles" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "components_org_serial_unique" UNIQUE ("orgId", "serialNumber"),
    CONSTRAINT "Component_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "Component_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL,
    CONSTRAINT "Component_parentComponentId_fkey" FOREIGN KEY ("parentComponentId") REFERENCES "Component"("id") ON DELETE SET NULL
);

CREATE INDEX "Component_orgId_type_idx" ON "Component" ("orgId", "type");
CREATE INDEX "Component_aircraftId_idx" ON "Component" ("aircraftId");

-- Signatories
CREATE TABLE "Signatory" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "credentialType" "SignatoryCredentialType" NOT NULL,
    "certificateId" TEXT,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signatory_orgId_certificateId_unique" UNIQUE ("orgId", "certificateId"),
    CONSTRAINT "Signatory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

-- Documents
CREATE TABLE "Document" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "kind" "DocumentKind" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'RECEIVED',
    "storageKey" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "Document_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL,
    CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "Document_orgId_kind_idx" ON "Document" ("orgId", "kind");

-- Document pages
CREATE TABLE "DocumentPage" (
    "id" TEXT PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "ocrStatus" "DocumentStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE,
    CONSTRAINT "DocumentPage_documentId_index_unique" UNIQUE ("documentId", "index")
);

-- Source references
CREATE TABLE "SourceReference" (
    "id" TEXT PRIMARY KEY,
    "documentPageId" TEXT NOT NULL,
    "bbox" JSONB NOT NULL,
    "lineIndex" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceReference_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "DocumentPage"("id") ON DELETE CASCADE
);

-- Maintenance events
CREATE TABLE "MaintenanceEvent" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "componentId" TEXT,
    "signatoryId" TEXT,
    "eventType" "MaintenanceEventType" NOT NULL,
    "origin" "MaintenanceEventOrigin" NOT NULL DEFAULT 'SYSTEM',
    "performedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tachHours" DECIMAL(10,2),
    "hobbsHours" DECIMAL(10,2),
    "cycles" INTEGER,
    "utilizationSource" TEXT,
    "description" TEXT NOT NULL,
    "correctiveAction" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewStatus" VARCHAR(32),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "MaintenanceEvent_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE,
    CONSTRAINT "MaintenanceEvent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL,
    CONSTRAINT "MaintenanceEvent_signatoryId_fkey" FOREIGN KEY ("signatoryId") REFERENCES "Signatory"("id") ON DELETE SET NULL
);

CREATE INDEX "MaintenanceEvent_orgId_aircraftId_performedAt_idx" ON "MaintenanceEvent" ("orgId", "aircraftId", "performedAt");
CREATE INDEX "MaintenanceEvent_componentId_idx" ON "MaintenanceEvent" ("componentId");
CREATE INDEX "MaintenanceEvent_origin_reviewStatus_idx" ON "MaintenanceEvent" ("origin", "reviewStatus");

-- Maintenance event sources
CREATE TABLE "MaintenanceEventSource" (
    "id" TEXT PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "documentId" TEXT,
    "sourceReferenceId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceEventSource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MaintenanceEvent"("id") ON DELETE CASCADE,
    CONSTRAINT "MaintenanceEventSource_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL,
    CONSTRAINT "MaintenanceEventSource_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE SET NULL
);

CREATE INDEX "MaintenanceEventSource_eventId_idx" ON "MaintenanceEventSource" ("eventId");

-- Directives
CREATE TABLE "Directive" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "directiveType" "DirectiveType" NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DirectiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "summary" TEXT,
    "supersededById" TEXT,
    "issuedOn" TIMESTAMP WITH TIME ZONE,
    "effectiveOn" TIMESTAMP WITH TIME ZONE,
    "applicability" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Directive_orgId_referenceCode_unique" UNIQUE ("orgId", "referenceCode"),
    CONSTRAINT "Directive_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "Directive_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "Directive"("id") ON DELETE SET NULL
);

CREATE INDEX "Directive_orgId_directiveType_idx" ON "Directive" ("orgId", "directiveType");

-- Maintenance event ↔ directive join table
CREATE TABLE "MaintenanceEventDirective" (
    "eventId" TEXT NOT NULL,
    "directiveId" TEXT NOT NULL,
    "complianceStatus" VARCHAR(32) NOT NULL,
    "notedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    PRIMARY KEY ("eventId", "directiveId"),
    CONSTRAINT "MaintenanceEventDirective_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MaintenanceEvent"("id") ON DELETE CASCADE,
    CONSTRAINT "MaintenanceEventDirective_directiveId_fkey" FOREIGN KEY ("directiveId") REFERENCES "Directive"("id") ON DELETE CASCADE
);

-- Compliance snapshots
CREATE TABLE "ComplianceSnapshot" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "asOf" TIMESTAMP WITH TIME ZONE NOT NULL,
    "summary" JSONB NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceSnapshot_unique" UNIQUE ("orgId", "aircraftId", "asOf"),
    CONSTRAINT "ComplianceSnapshot_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "ComplianceSnapshot_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE
);

-- Embeddings
CREATE TABLE "Embedding" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "scope" "EmbeddingScope" NOT NULL,
    "targetEventId" TEXT,
    "targetDocumentId" TEXT,
    "targetDocumentPageId" TEXT,
    "targetDirectiveId" TEXT,
    "targetComplianceSnapshotId" TEXT,
    "targetAircraftId" TEXT,
    "dimensions" INTEGER NOT NULL,
    "vector" DOUBLE PRECISION[] NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Embedding_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "Embedding_targetEventId_fkey" FOREIGN KEY ("targetEventId") REFERENCES "MaintenanceEvent"("id") ON DELETE CASCADE,
    CONSTRAINT "Embedding_targetDocumentId_fkey" FOREIGN KEY ("targetDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE,
    CONSTRAINT "Embedding_targetDocumentPageId_fkey" FOREIGN KEY ("targetDocumentPageId") REFERENCES "DocumentPage"("id") ON DELETE CASCADE,
    CONSTRAINT "Embedding_targetDirectiveId_fkey" FOREIGN KEY ("targetDirectiveId") REFERENCES "Directive"("id") ON DELETE CASCADE,
    CONSTRAINT "Embedding_targetComplianceSnapshotId_fkey" FOREIGN KEY ("targetComplianceSnapshotId") REFERENCES "ComplianceSnapshot"("id") ON DELETE CASCADE,
    CONSTRAINT "Embedding_targetAircraftId_fkey" FOREIGN KEY ("targetAircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE
);

CREATE INDEX "Embedding_orgId_scope_idx" ON "Embedding" ("orgId", "scope");
ALTER TABLE "Embedding"
  ADD CONSTRAINT "Embedding_scope_targets_unique"
  UNIQUE ("scope", "targetEventId", "targetDocumentId", "targetDocumentPageId", "targetDirectiveId", "targetComplianceSnapshotId", "targetAircraftId");

-- Due items
CREATE TABLE "DueItem" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "componentId" TEXT,
    "directiveId" TEXT,
    "eventType" "MaintenanceEventType",
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP WITH TIME ZONE,
    "dueHours" DECIMAL(10,2),
    "dueCycles" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DueItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "DueItem_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE CASCADE,
    CONSTRAINT "DueItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL,
    CONSTRAINT "DueItem_directiveId_fkey" FOREIGN KEY ("directiveId") REFERENCES "Directive"("id") ON DELETE SET NULL
);

CREATE INDEX "DueItem_orgId_dueAt_idx" ON "DueItem" ("orgId", "dueAt");

-- Shares
CREATE TABLE "Share" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "aircraftId" TEXT,
    "invitedEmail" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE,
    "acceptedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Share_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "Share_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "Aircraft"("id") ON DELETE SET NULL,
    CONSTRAINT "Share_orgId_invitedEmail_aircraftId_unique" UNIQUE ("orgId", "invitedEmail", "aircraftId")
);

-- Audit log
CREATE TABLE "AuditLog" (
    "id" TEXT PRIMARY KEY,
    "orgId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" VARCHAR(32) NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "AuditLog_orgId_entityType_idx" ON "AuditLog" ("orgId", "entityType");
CREATE INDEX "AuditLog_entityId_entityType_idx" ON "AuditLog" ("entityId", "entityType");

-- Compliance snapshot ↔ embeddings relation handled through foreign keys; create index for share uniqueness already defined.

-- Update timestamps trigger (optional) can be added later via Prisma
