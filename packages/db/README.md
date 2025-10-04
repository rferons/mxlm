# Database Package (@mxlm/db)

This package contains the Prisma ORM schema, migrations, and database utilities for the GA Maintenance LogbookLM application. It provides a normalized PostgreSQL database schema for managing aircraft maintenance logbooks, compliance tracking, and related data.

## 🏗️ Architecture

### Schema Organization
The Prisma schema is organized into modular files for better maintainability:

```
prisma/schema/
├── root.prisma          # Generator and datasource configuration
├── enums.prisma         # All enum definitions
└── models/              # Individual model files
    ├── organization.prisma
    ├── user.prisma
    ├── aircraft.prisma
    ├── component.prisma
    ├── maintenance_event.prisma
    └── ... (other models)
```

### Key Features
- **Multi-tenant Architecture**: Organization-scoped data isolation
- **Audit Trail**: Complete audit logging for all changes
- **Compliance Tracking**: Built-in support for FAA regulations and AD/SB compliance
- **Document Management**: Handles scanned logbook pages and digital files
- **Vector Search**: Embeddings support for semantic search
- **Flexible Sharing**: Granular access control for mechanics and operators

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20.x
- PostgreSQL database
- pnpm package manager

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create .env file in project root
   DATABASE_URL="postgresql://username:password@localhost:5432/logbooklm"
   ```

3. **Generate Prisma client:**
   ```bash
   pnpm run generate
   ```

4. **Run migrations:**
   ```bash
   pnpm run migrate:deploy
   ```

5. **Seed the database (optional):**
   ```bash
   pnpm run seed
   ```

## 📝 Development Workflow

### Schema Changes

**⚠️ Important**: Never edit `prisma/.generated/schema.prisma` directly. Always edit the source files in `prisma/schema/`.

1. **Edit schema files** in `prisma/schema/models/` or `prisma/schema/enums.prisma`

2. **Compose the schema:**
   ```bash
   pnpm run compose
   ```

3. **Generate migration:**
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

4. **Update Prisma client:**
   ```bash
   pnpm run generate
   ```

### Adding New Models

1. **Create model file** in `prisma/schema/models/your_model.prisma`
2. **Add to model order** in `scripts/compose-schema.mjs` (line 13-31)
3. **Run compose and generate:**
   ```bash
   pnpm run compose
   pnpm run generate
   ```

### Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm run compose` | Combines schema files into generated schema |
| `pnpm run generate` | Generates Prisma client from schema |
| `pnpm run migrate:deploy` | Applies migrations to database |
| `pnpm run migrate:status` | Shows migration status |
| `pnpm run test` | Runs database tests |

## 🗄️ Database Schema Overview

### Core Entities

#### Organizations & Users
- **Organization**: Multi-tenant root entity
- **User**: System users with role-based access
- **Share**: Granular sharing permissions

#### Aircraft & Components
- **Aircraft**: Aircraft registry and metadata
- **Component**: Engines, propellers, appliances, etc.
- **Signatory**: A&P mechanics, IAs, repair stations

#### Documents & Events
- **Document**: Uploaded logbook files (PDFs, images)
- **DocumentPage**: Individual pages with OCR data
- **MaintenanceEvent**: Normalized maintenance records
- **SourceReference**: Links events back to source pages

#### Compliance & Directives
- **Directive**: FAA ADs, SBs, STCs, ICAs
- **ComplianceSnapshot**: Calculated compliance status
- **DueItem**: Upcoming maintenance requirements

#### Search & Audit
- **Embedding**: Vector embeddings for semantic search
- **AuditLog**: Complete change history

### Key Relationships

```mermaid
erDiagram
    Organization ||--o{ User : has
    Organization ||--o{ Aircraft : owns
    Aircraft ||--o{ Component : contains
    Aircraft ||--o{ MaintenanceEvent : has
    MaintenanceEvent ||--o{ SourceReference : references
    Document ||--o{ DocumentPage : contains
    MaintenanceEvent }o--|| Signatory : signed_by
    Directive ||--o{ MaintenanceEvent : applies_to
```

## 🔧 Usage Examples

### Basic Prisma Client Usage

```typescript
import { PrismaClient } from '@mxlm/db';

const prisma = new PrismaClient();

// Create a new aircraft
const aircraft = await prisma.aircraft.create({
  data: {
    organizationId: 'org-123',
    make: 'Cessna',
    model: '172',
    serialNumber: '172-12345',
    registration: 'N12345',
  },
});

// Query maintenance events with related data
const events = await prisma.maintenanceEvent.findMany({
  where: {
    aircraftId: aircraft.id,
  },
  include: {
    signatory: true,
    sources: {
      include: {
        documentPage: true,
      },
    },
  },
});
```

### Multi-tenant Queries

```typescript
// Always scope queries by organization
const events = await prisma.maintenanceEvent.findMany({
  where: {
    aircraft: {
      organizationId: 'org-123',
    },
    eventType: 'INSPECTION',
  },
});
```

### Compliance Queries

```typescript
// Get compliance status for an aircraft
const compliance = await prisma.complianceSnapshot.findFirst({
  where: {
    aircraftId: aircraft.id,
  },
  orderBy: {
    createdAt: 'desc',
  },
});

// Get upcoming due items
const dueItems = await prisma.dueItem.findMany({
  where: {
    aircraftId: aircraft.id,
    dueDate: {
      lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
    },
  },
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all database tests
pnpm run test

# Run specific test file
pnpm run test tests/migrations.test.ts
```

### Test Database Setup

Tests use Testcontainers to spin up a real PostgreSQL instance:

```typescript
import { PrismaClient } from '@mxlm/db';

describe('Database Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Testcontainers setup
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

## 🔒 Security & Best Practices

### Data Isolation
- All queries must be scoped by `organizationId`
- Use Prisma middleware to enforce tenant isolation
- Never expose raw database queries to the client

### Audit Trail
- All changes are automatically logged via Prisma middleware
- Audit logs include user, timestamp, and change details
- Immutable audit records for compliance

### Performance
- Use database indexes for frequently queried fields
- Implement pagination for large result sets
- Use Prisma's `select` and `include` to limit data transfer

## 🚨 Common Issues & Solutions

### Schema Composition Errors
```bash
# If you get "unexpected Prisma model files" error:
# 1. Add your new model to modelOrder in compose-schema.mjs
# 2. Run: pnpm run compose
```

### Migration Conflicts
```bash
# Reset migrations (development only):
npx prisma migrate reset

# Check migration status:
pnpm run migrate:status
```

### Client Generation Issues
```bash
# Regenerate client after schema changes:
pnpm run compose
pnpm run generate
```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Project Design Spec](../../design_spec.md)
- [Database Schema Diagrams](./docs/schema-diagrams.md)

## 🤝 Contributing

1. **Follow the schema organization** - keep models in separate files
2. **Update model order** when adding new models
3. **Write tests** for new database functionality
4. **Document breaking changes** in migrations
5. **Use descriptive migration names**

---

**Need help?** Check the [project documentation](../../README.md) or reach out to the development team.
